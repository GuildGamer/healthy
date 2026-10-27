import AVFoundation
import ExpoModulesCore
import QuickPoseCamera
import QuickPoseCore
import UIKit

final class HealthyQuickPoseView: ExpoView {
  let onUpdate = EventDispatcher()
  let onProofRecorded = EventDispatcher()
  let onProofRecordingError = EventDispatcher()

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

  /// When set, frames are written to a proof clip with this overlay.
  var proofRecording: [String: Any]? {
    didSet { syncProofRecording() }
  }

  /// Live rep count pushed from JS while a proof clip is recording.
  var proofCount: Int = 0 {
    didSet {
      proofRecorder?.updateOverlay(count: proofCount)
    }
  }

  /// Wall-clock ms of the last rep plus a short tail. Old clients leave this nil.
  var finishProofEndAtMs: Double = 0

  /// Incremented by JS to finish the in-flight recording (not cancel it).
  var finishProofToken: Int = 0 {
    didSet {
      if finishProofToken > 0 {
        finishProofRecording()
      }
    }
  }

  private var quickPose: QuickPose?
  private var camera: QuickPoseCamera?
  /// Retained here: the capture output holds its delegate weakly.
  private var frameTap: CameraFrameTap?
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private let overlayView = UIImageView()
  private var hasStarted = false
  private var currentFeatures: [(String, QuickPose.Feature)] = []
  private var proofRecorder: ProofRecorder?
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
    let tap = CameraFrameTap(quickPose: qp)
    do {
      try cam.start(delegate: tap)
    } catch {
      return
    }

    hasStarted = true
    currentFeatures = mapped
    quickPose = qp
    camera = cam
    frameTap = tap
    attachPreview(from: cam)

    // Fifth argument is QuickPose landmarks. Shape confirmed on device in the
    // recording spike; phase 5 skeleton replay will consume it once typed.
    qp.start(features: mapped.map(\.1), onFrame: { [weak self] status, image, featureResults, feedback, _ in
      DispatchQueue.main.async {
        self?.publishFrame(
          status: status,
          image: image,
          featureResults: featureResults,
          feedback: feedback
        )
      }
    })

    syncProofRecording()
  }

  /// SDK Status.success carries a single labeled `info:` payload — not two wildcards.
  private func publishFrame(
    status: QuickPose.Status,
    image: UIImage?,
    featureResults: [QuickPose.Feature: QuickPose.FeatureResult],
    feedback: [QuickPose.Feature: QuickPose.PoseFeedback]
  ) {
    overlayView.image = image

    if let recorder = proofRecorder, recorder.isRecording {
      recorder.append(cameraFrame: frameTap?.newestFrame())
    }

    guard case .success(info: _) = status else { return }

    var results: [String: Double] = [:]
    var feedbacks: [String: String] = [:]
    for (key, feature) in currentFeatures {
      if let value = featureResults[feature]?.value {
        results[key] = value
      }
      if let prompt = feedback[feature]?.displayString, !prompt.isEmpty {
        feedbacks[key] = prompt
      }
    }
    onUpdate([
      "results": results,
      "feedbacks": feedbacks,
    ])
  }

  private func syncProofRecording() {
    guard hasStarted else { return }

    guard let config = proofRecording,
          let code = config["code"] as? String,
          !code.isEmpty,
          let maxDurationSeconds = config["maxDurationSeconds"] as? Double
    else {
      if proofRecorder?.isRecording == true {
        proofRecorder?.cancel()
      }
      proofRecorder = nil
      frameTap?.setKeepingFrames(false)
      return
    }

    if proofRecorder?.isRecording == true {
      proofRecorder?.updateOverlay(
        code: code,
        label: (config["label"] as? String) ?? "",
        count: proofCount
      )
      return
    }

    let recorder = ProofRecorder()
    do {
      try recorder.start(
        overlay: ProofRecorder.Overlay(
          code: code,
          label: (config["label"] as? String) ?? "",
          count: proofCount
        ),
        mirrorsCamera: useFrontCamera,
        maxDurationSeconds: maxDurationSeconds
      )
      proofRecorder = recorder
      frameTap?.setKeepingFrames(true)
    } catch {
      onProofRecordingError(["message": "Could not start proof recording."])
      proofRecorder = nil
    }
  }

  /// Ends the clip and emits `onProofRecorded` with file URIs and the hash.
  func finishProofRecording() {
    guard let recorder = proofRecorder, recorder.isRecording else { return }
    frameTap?.setKeepingFrames(false)
    let endAt = finishProofEndAtMs > 0 ? finishProofEndAtMs : nil
    recorder.finish(endAtWallMs: endAt) { [weak self] result in
      DispatchQueue.main.async {
        self?.proofRecorder = nil
        switch result {
        case .success(let finished):
          var payload: [String: Any] = [
            "fileUri": finished.fileURL.absoluteString,
            "sha256": finished.sha256Hex,
            "byteSize": finished.byteSize,
            "durationSeconds": finished.durationSeconds,
          ]
          if let poster = finished.posterURL {
            payload["posterUri"] = poster.absoluteString
          }
          self?.onProofRecorded(payload)
        case .failure:
          self?.onProofRecordingError(["message": "Could not finish proof recording."])
        }
      }
    }
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
    if proofRecorder?.isRecording == true {
      proofRecorder?.cancel()
    }
    proofRecorder = nil
    quickPose?.stop()
    quickPose = nil
    camera?.stop()
    camera = nil
    frameTap?.setKeepingFrames(false)
    frameTap = nil
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
    case "fitness.squats":
      return .fitness(.squats, style: style)
    case "fitness.plank":
      return .fitness(.plank, style: style)
    case "fitness.jumpingJacks":
      return .fitness(.jumpingJacks, style: style)
    case "fitness.burpees":
      return .fitness(.burpees, style: style)
    case "fitness.sitUps":
      return .fitness(.sitUps, style: style)
    case "fitness.mountainClimbers":
      return .fitness(.mountainClimbers, style: style)
    case "fitness.lunges", "fitness.lunges.left":
      return .fitness(.lunges(side: .left), style: style)
    case "fitness.lunges.right":
      return .fitness(.lunges(side: .right), style: style)
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
