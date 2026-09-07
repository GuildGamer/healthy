import AVFoundation
import ExpoModulesCore
import QuickPoseCamera
import QuickPoseCore
import UIKit

final class HealthyQuickPoseView: ExpoView {
  let onUpdate = EventDispatcher()

  var sdkKey = "" {
    didSet { tryStart() }
  }

  var featureKeys: [String] = [] {
    didSet { applyFeatures() }
  }

  var featureStyles: [String: Any] = [:] {
    didSet { applyFeatures() }
  }

  var useFrontCamera = true {
    didSet { tryStart() }
  }

  private var quickPose: QuickPose?
  private var camera: QuickPoseCamera?
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private let overlayView = UIImageView()
  private var hasStarted = false
  private var currentFeatures: [(String, QuickPose.Feature)] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    overlayView.contentMode = .scaleAspectFill
    overlayView.isUserInteractionEnabled = false
    addSubview(overlayView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
    overlayView.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      stop()
      return
    }
    tryStart()
  }

  private func tryStart() {
    guard !sdkKey.isEmpty, !featureKeys.isEmpty, !hasStarted else { return }

    let mapped = mapFeatures()
    guard !mapped.isEmpty else { return }

    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      break
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        DispatchQueue.main.async {
          guard granted else { return }
          self?.tryStart()
        }
      }
      return
    default:
      return
    }

    let qp = QuickPose(sdkKey: sdkKey)
    let cam = QuickPoseCamera(useFrontCamera: useFrontCamera)
    do {
      try cam.start(delegate: qp)
    } catch {
      return
    }

    hasStarted = true
    currentFeatures = mapped
    quickPose = qp
    camera = cam
    attachPreview(from: cam)

    qp.start(features: mapped.map(\.1), onFrame: { [weak self] status, image, featureResults, feedback, _ in
      DispatchQueue.main.async {
        guard let self else { return }
        self.overlayView.image = image
        guard case .success = status else { return }

        var results: [String: Double] = [:]
        var feedbacks: [String: String] = [:]
        for (key, feature) in self.currentFeatures {
          if let value = featureResults[feature]?.value {
            results[key] = value
          }
          if let prompt = feedback[feature]?.displayString, !prompt.isEmpty {
            feedbacks[key] = prompt
          }
        }
        self.onUpdate([
          "results": results,
          "feedbacks": feedbacks,
        ])
      }
    })
  }

  private func attachPreview(from cam: QuickPoseCamera, attempt: Int = 0) {
    if let session = cam.session {
      let layer = AVCaptureVideoPreviewLayer(session: session)
      layer.videoGravity = .resizeAspectFill
      layer.frame = bounds
      self.layer.insertSublayer(layer, at: 0)
      previewLayer = layer
      return
    }

    guard attempt < 40 else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      guard let self, self.camera === cam else { return }
      self.attachPreview(from: cam, attempt: attempt + 1)
    }
  }

  private func applyFeatures() {
    let mapped = mapFeatures()
    guard hasStarted, let qp = quickPose, !mapped.isEmpty else {
      tryStart()
      return
    }
    currentFeatures = mapped
    qp.update(features: mapped.map(\.1))
  }

  private func stop() {
    quickPose?.stop()
    quickPose = nil
    camera?.stop()
    camera = nil
    previewLayer?.removeFromSuperlayer()
    previewLayer = nil
    overlayView.image = nil
    hasStarted = false
    currentFeatures = []
  }

  private func mapFeatures() -> [(String, QuickPose.Feature)] {
    featureKeys.compactMap { key in
      let extras = featureStyles[key] as? [String: Any] ?? [:]
      let style = Self.parseStyle(extras)
      guard let feature = Self.feature(for: key, style: style, extras: extras) else {
        return nil
      }
      return (key, feature)
    }
  }

  private static func feature(
    for key: String,
    style: QuickPose.Style,
    extras: [String: Any]
  ) -> QuickPose.Feature? {
    switch key {
    case "fitness.pushUps":
      return .fitness(.pushUps, style: style)
    case "overlay.wholeBody":
      return .overlay(.wholeBody, style: style)
    case "inside.wholeBody":
      return .inside(insets(from: extras["edgeInsets"] as? [String: Any]), limb: .wholeBody, style: style)
    default:
      return nil
    }
  }

  private static func insets(from dict: [String: Any]?) -> QuickPose.RelativeCameraEdgeInsets {
    QuickPose.RelativeCameraEdgeInsets(
      top: CGFloat(dict?["top"] as? Double ?? 0.1),
      left: CGFloat(dict?["left"] as? Double ?? 0.1),
      bottom: CGFloat(dict?["bottom"] as? Double ?? 0.1),
      right: CGFloat(dict?["right"] as? Double ?? 0.1)
    )
  }

  private static func parseStyle(_ dict: [String: Any]) -> QuickPose.Style {
    let color = (dict["color"] as? String).flatMap(UIColor.fromHex) ?? .white
    var conditionalColors: [QuickPose.Style.ConditionalColor]?
    if let raw = dict["conditionalColors"] as? [[String: Any]] {
      conditionalColors = raw.compactMap { item in
        guard let hex = item["color"] as? String, let parsed = UIColor.fromHex(hex) else {
          return nil
        }
        return QuickPose.Style.ConditionalColor(
          min: item["min"] as? Double,
          max: item["max"] as? Double,
          color: parsed
        )
      }
    }

    return QuickPose.Style(
      hidden: dict["hidden"] as? Bool ?? false,
      relativeLineWidth: dict["relativeLineWidth"] as? Double ?? 1.0,
      cornerRadius: dict["cornerRadius"] as? Double ?? 0.0,
      color: color,
      conditionalColors: conditionalColors
    )
  }
}

private extension UIColor {
  static func fromHex(_ hex: String) -> UIColor? {
    var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    sanitized = sanitized.replacingOccurrences(of: "#", with: "")
    var rgb: UInt64 = 0
    guard Scanner(string: sanitized).scanHexInt64(&rgb) else { return nil }
    if sanitized.count == 6 {
      return UIColor(
        red: CGFloat((rgb & 0xFF0000) >> 16) / 255,
        green: CGFloat((rgb & 0x00FF00) >> 8) / 255,
        blue: CGFloat(rgb & 0x0000FF) / 255,
        alpha: 1
      )
    }
    return nil
  }
}
