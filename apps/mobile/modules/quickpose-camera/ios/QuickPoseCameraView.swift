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

  /// MatchMetric pose value — drives native threshold/hold/stance.
  var metric: String = "pushups" {
    didSet {
      guard oldValue != metric else { return }
      countQueue.async { [weak self] in
        self?.countEngine.metric = self?.metric ?? "pushups"
      }
    }
  }

  /// Increment to reset the native counter (session reset / non-preserve start).
  var resetCountToken: Int = 0 {
    didSet {
      guard oldValue != resetCountToken, resetCountToken > 0 else { return }
      countQueue.async { [weak self] in
        self?.countEngine.reset()
        self?.lastPublishedCount = -1
        self?.lastPublishedPhase = ""
        self?.lastPublishedCoach = nil
      }
    }
  }

  var useFrontCamera = true {
    didSet { tryStart() }
  }

  /// When set, frames are written to a proof clip with this overlay.
  var proofRecording: [String: Any]? {
    didSet { syncProofRecording() }
  }

  /// Optional overlay count override (freeze/review). Live recording uses native count.
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
        overlayFromNative = false
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
  private let countEngine = PoseCountEngine()
  private let countQueue = DispatchQueue(label: "healthy.quickpose.count")
  private var pendingEmit: [String: Any]?
  private var emitWorkItem: DispatchWorkItem?
  private var lastEmitMs: Int64 = 0
  private var lastPublishedCount = -1
  private var lastPublishedPhase = ""
  private var lastPublishedCoach: String?
  /// Live burn-in until JS finishes the clip (frozen proofCount wins after).
  private var overlayFromNative = true
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

    qp.start(features: mapped.map(\.1), onFrame: { [weak self] status, image, featureResults, feedback, landmarks in
      // Overlay + proof append on main; counting stays off the JS bridge.
      DispatchQueue.main.async {
        self?.overlayView.image = image
        if let recorder = self?.proofRecorder, recorder.isRecording {
          recorder.append(cameraFrame: self?.frameTap?.newestFrame())
        }
      }
      self?.publishFrame(
        status: status,
        featureResults: featureResults,
        feedback: feedback,
        landmarks: landmarks
      )
    })

    syncProofRecording()
  }

  /// Count on the pose callback path, then coalesce JS emits (~30 Hz / count change).
  private func publishFrame(
    status: QuickPose.Status,
    featureResults: [QuickPose.Feature: QuickPose.FeatureResult],
    feedback: [QuickPose.Feature: QuickPose.PoseFeedback],
    landmarks: QuickPose.Landmarks?
  ) {
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

    let stanceFrame = Self.stanceFrame(landmarks)
    let landmarksAvailable = landmarks != nil
    let nowMs = Int64(Date().timeIntervalSince1970 * 1000)

    countQueue.async { [weak self] in
      guard let self else { return }
      let snapshot = self.countEngine.process(
        results: results,
        feedbacks: feedbacks,
        frame: stanceFrame,
        landmarksAvailable: landmarksAvailable,
        nowMs: nowMs
      )
      let liveCount = snapshot.count
      DispatchQueue.main.async {
        if self.overlayFromNative, self.proofRecorder?.isRecording == true {
          self.proofRecorder?.updateOverlay(count: liveCount)
        }
      }
      let payload: [String: Any] = [
        "results": results,
        "feedbacks": feedbacks,
        "landmarks": Self.landmarksPayload(stanceFrame),
        "landmarksAvailable": landmarksAvailable,
        "count": liveCount,
        "phase": snapshot.phase,
        "bodyInFrame": snapshot.bodyInFrame,
        "tooClose": snapshot.tooClose,
        "coachPrompt": snapshot.coachPrompt ?? "",
        "measure": snapshot.measure ?? -1.0,
      ]
      self.coalesceEmit(payload, countChanged: snapshot.countChanged, snapshot: snapshot)
    }
  }

  private func coalesceEmit(
    _ payload: [String: Any],
    countChanged: Bool,
    snapshot: PoseCountEngine.Snapshot
  ) {
    let now = Int64(Date().timeIntervalSince1970 * 1000)
    let phaseChanged = snapshot.phase != lastPublishedPhase
    let coachChanged = snapshot.coachPrompt != lastPublishedCoach
    let due =
      countChanged || phaseChanged || coachChanged || now - lastEmitMs >= Self.emitMinIntervalMs
    pendingEmit = payload
    if countChanged {
      flushEmit()
      return
    }
    if !due {
      if emitWorkItem == nil {
        let work = DispatchWorkItem { [weak self] in
          self?.flushEmit()
        }
        emitWorkItem = work
        countQueue.asyncAfter(deadline: .now() + .milliseconds(Int(Self.emitMinIntervalMs)), execute: work)
      }
      return
    }
    flushEmit()
  }

  private func flushEmit() {
    emitWorkItem?.cancel()
    emitWorkItem = nil
    guard let payload = pendingEmit else { return }
    pendingEmit = nil
    lastEmitMs = Int64(Date().timeIntervalSince1970 * 1000)
    lastPublishedCount = payload["count"] as? Int ?? lastPublishedCount
    lastPublishedPhase = payload["phase"] as? String ?? lastPublishedPhase
    let coach = payload["coachPrompt"] as? String
    lastPublishedCoach = (coach?.isEmpty == false) ? coach : nil
    DispatchQueue.main.async { [weak self] in
      self?.onUpdate(payload)
    }
  }

  private static let landmarkMinVisibility = 0.2
  private static let emitMinIntervalMs: Int64 = 33
  private static let landmarkJoints: [(String, QuickPose.Landmarks.Body)] = [
    ("nose", .nose),
    ("leftShoulder", .shoulder(side: .left)),
    ("rightShoulder", .shoulder(side: .right)),
    ("leftElbow", .elbow(side: .left)),
    ("rightElbow", .elbow(side: .right)),
    ("leftWrist", .wrist(side: .left)),
    ("rightWrist", .wrist(side: .right)),
    ("leftHip", .hip(side: .left)),
    ("rightHip", .hip(side: .right)),
    ("leftKnee", .knee(side: .left)),
    ("rightKnee", .knee(side: .right)),
    ("leftAnkle", .ankle(side: .left)),
    ("rightAnkle", .ankle(side: .right)),
  ]

  private static func stanceFrame(_ landmarks: QuickPose.Landmarks?) -> PoseStance.Frame? {
    guard let landmarks else { return nil }
    var out: PoseStance.Frame = [:]
    for (key, joint) in landmarkJoints {
      let point = landmarks.landmark(forBody: joint)
      if point.visibility < landmarkMinVisibility {
        continue
      }
      out[key] = PoseStance.Point(x: point.x, y: point.y, score: point.visibility)
    }
    return out
  }

  private static func landmarksPayload(_ frame: PoseStance.Frame?) -> [String: [String: Double]] {
    guard let frame else { return [:] }
    var out: [String: [String: Double]] = [:]
    for (key, point) in frame {
      out[key] = ["x": point.x, "y": point.y, "score": point.score]
    }
    return out
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

    let liveCount = countQueue.sync { countEngine.liveCount() }

    if proofRecorder?.isRecording == true {
      proofRecorder?.updateOverlay(
        code: code,
        label: (config["label"] as? String) ?? "",
        count: liveCount
      )
      return
    }

    let recorder = ProofRecorder()
    do {
      overlayFromNative = true
      try recorder.start(
        overlay: ProofRecorder.Overlay(
          code: code,
          label: (config["label"] as? String) ?? "",
          count: liveCount
        ),
        mirrorsCamera: useFrontCamera,
        maxDurationSeconds: maxDurationSeconds,
        encoding: ProofRecorder.Encoding(
          bitRate: Self.intValue(config["bitRate"], fallback: 1_500_000),
          frameRate: Self.doubleValue(config["frameRate"], fallback: 24),
          width: Self.intValue(config["width"], fallback: 720),
          height: Self.intValue(config["height"], fallback: 1280)
        )
      )
      proofRecorder = recorder
      frameTap?.setKeepingFrames(true)
    } catch {
      onProofRecordingError(["message": "Could not start proof recording."])
      proofRecorder = nil
    }
  }

  private static func intValue(_ raw: Any?, fallback: Int) -> Int {
    if let value = raw as? Int { return value }
    if let value = raw as? Double { return Int(value) }
    if let value = raw as? NSNumber { return value.intValue }
    return fallback
  }

  private static func doubleValue(_ raw: Any?, fallback: Double) -> Double {
    if let value = raw as? Double { return value }
    if let value = raw as? Int { return Double(value) }
    if let value = raw as? NSNumber { return value.doubleValue }
    return fallback
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
    countQueue.async { [weak self] in
      self?.emitWorkItem?.cancel()
      self?.emitWorkItem = nil
      self?.pendingEmit = nil
    }
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
