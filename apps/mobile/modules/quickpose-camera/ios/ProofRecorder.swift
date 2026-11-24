import AVFoundation
import CoreImage
import CryptoKit
import UIKit

/**
 * Writes a muted H.264 clip of the plain camera image. The skeleton stays on
 * the live preview only.
 *
 * Proof chrome (mark, verification code, live rep count, date) is burned
 * in before encoding so the exported file is self-evidencing. A poster JPEG is
 * captured from the first written frame.
 *
 * Camera frames are not mirrored (QuickPose keeps ML input raw) but the front
 * preview is, so a front-camera frame is mirrored to match what the person saw.
 * Frames are drawn once into the writer pixel-buffer pool — no UIImage round trip.
 */
final class ProofRecorder {
  struct Overlay {
    var code: String
    var label: String
    var count: Int
  }

  private(set) var isRecording = false

  private var writer: AVAssetWriter?
  private var input: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  /// The clip's time zero. A session that starts before its first frame plays black until that frame.
  private var firstFrameAt: CFTimeInterval?
  /// Wall-clock ms of the first written frame, for trim-to-last-rep.
  private var firstFrameWallMs: Double?
  private var lastFrameSeconds: Double?
  /// Optional end of the set in wall-clock ms; frames after this are dropped.
  private var endAtWallMs: Double?
  /// One frame in flight at most: a queued frame holds a camera buffer, and a backlog starves the camera and QuickPose.
  private let inFlightLock = NSLock()
  private var isFrameInFlight = false
  private var outputURL: URL?
  private var posterURL: URL?
  private var posterCaptured = false
  private var mirrorsCamera = false
  private var maxDurationSeconds: Double = 0
  private var overlay = Overlay(code: "", label: "", count: 0)
  private let writeQueue = DispatchQueue(label: "healthy.proof-recorder")
  private let imageContext = CIContext(options: [.useSoftwareRenderer: false])

  /// Defaults when JS sends an unusable value (social-safe vertical).
  private static let defaultWidth = 1080
  private static let defaultHeight = 1920
  private static let defaultBitRate = 5_000_000
  private static let defaultFrameRate = 30.0
  private static let socialCutMaxSeconds: Double = 15
  private static let timescale: CMTimeScale = 600
  private static let posterJpegQuality: CGFloat = 0.7

  private var targetWidth = ProofRecorder.defaultWidth
  private var targetHeight = ProofRecorder.defaultHeight
  private var minimumFrameGapSeconds = 1.0 / ProofRecorder.defaultFrameRate

  struct Encoding {
    var bitRate: Int
    var frameRate: Double
    var width: Int
    var height: Int
  }

  func start(
    overlay: Overlay,
    mirrorsCamera: Bool,
    maxDurationSeconds: Double,
    encoding: Encoding
  ) throws {
    stopWithoutFinishing()

    let width = Self.evenDimensionOrDefault(encoding.width, default: Self.defaultWidth)
    let height = Self.evenDimensionOrDefault(encoding.height, default: Self.defaultHeight)
    let bitRate = Self.clamped(encoding.bitRate, default: Self.defaultBitRate, min: 50_000, max: 200_000_000)
    let frameRate = Self.clamped(
      encoding.frameRate,
      default: Self.defaultFrameRate,
      min: 1,
      max: 120
    )

    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent("proof-clips", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    let stamp = Int(Date().timeIntervalSince1970 * 1000)
    let videoURL = directory.appendingPathComponent("clip-\(stamp).mp4")
    let poster = directory.appendingPathComponent("poster-\(stamp).jpg")

    if FileManager.default.fileExists(atPath: videoURL.path) {
      try FileManager.default.removeItem(at: videoURL)
    }

    let assetWriter = try AVAssetWriter(outputURL: videoURL, fileType: .mp4)
    let settings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: width,
      AVVideoHeightKey: height,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitRate,
        AVVideoMaxKeyFrameIntervalKey: Int(max(1, frameRate.rounded())),
        AVVideoExpectedSourceFrameRateKey: Int(max(1, frameRate.rounded())),
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      ],
    ]

    let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    videoInput.expectsMediaDataInRealTime = true

    let pixelAdaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: videoInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
      ]
    )

    guard assetWriter.canAdd(videoInput) else {
      throw ProofRecorderError.cannotAddInput
    }
    assetWriter.add(videoInput)

    guard assetWriter.startWriting() else {
      throw assetWriter.error ?? ProofRecorderError.startFailed
    }
    assetWriter.startSession(atSourceTime: .zero)

    writer = assetWriter
    input = videoInput
    adaptor = pixelAdaptor
    firstFrameAt = nil
    firstFrameWallMs = nil
    lastFrameSeconds = nil
    endAtWallMs = nil
    outputURL = videoURL
    posterURL = poster
    posterCaptured = false
    self.mirrorsCamera = mirrorsCamera
    self.maxDurationSeconds = maxDurationSeconds
    self.overlay = overlay
    targetWidth = width
    targetHeight = height
    minimumFrameGapSeconds = 1.0 / frameRate
    isRecording = true
  }

  /** Even dimensions only; range matches the API contract (256…3840). */
  private static func evenDimensionOrDefault(_ value: Int, default fallback: Int) -> Int {
    guard value >= 256, value <= 3840, value % 2 == 0 else { return fallback }
    return value
  }

  private static func clamped(_ value: Int, default fallback: Int, min: Int, max: Int) -> Int {
    guard value >= min, value <= max else { return fallback }
    return value
  }

  private static func clamped(_ value: Double, default fallback: Double, min: Double, max: Double) -> Double {
    guard value >= min, value <= max else { return fallback }
    return value
  }

  /// Trims standing-up after the last rep. Old clients omit this and keep the full clip.
  func setEndAtWallMs(_ endAtMs: Double?) {
    endAtWallMs = endAtMs
  }

  func updateOverlay(code: String? = nil, label: String? = nil, count: Int? = nil) {
    if let code { overlay.code = code }
    if let label { overlay.label = label }
    if let count { overlay.count = count }
  }

  /// Appends one composited frame. Safe to call from the capture timer.
  /// Retains `sampleBuffer` until the write finishes so the capture pool cannot
  /// reclaim the pixel memory mid-encode. Skips when there is no camera image.
  func append(sampleBuffer: CMSampleBuffer?) {
    guard isRecording, let writer, writer.status == .writing, let sampleBuffer else { return }
    guard let cameraFrame = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    guard claimFrameSlot() else { return }
    let capturedAt = CACurrentMediaTime()

    writeQueue.async { [weak self] in
      guard let self else { return }
      // `sampleBuffer` is captured by this block so the pixel memory stays valid until we finish.
      defer { self.releaseFrameSlot() }
      guard self.isRecording else { return }
      guard let input = self.input, input.isReadyForMoreMediaData else { return }
      guard let adaptor = self.adaptor else { return }
      let wallMs = Date().timeIntervalSince1970 * 1000
      if let endAt = self.endAtWallMs, wallMs > endAt {
        return
      }
      let elapsedSeconds = self.firstFrameAt.map { capturedAt - $0 } ?? 0
      guard self.isDueForFrame(at: elapsedSeconds) else { return }

      var poolBuffer: CVPixelBuffer?
      guard let pool = adaptor.pixelBufferPool,
            CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &poolBuffer) == kCVReturnSuccess,
            let buffer = poolBuffer
      else {
        return
      }

      guard self.renderFrame(cameraFrame: cameraFrame, into: buffer) else { return }
      let time = CMTime(seconds: elapsedSeconds, preferredTimescale: Self.timescale)

      if adaptor.append(buffer, withPresentationTime: time) {
        if self.firstFrameAt == nil {
          self.firstFrameAt = capturedAt
          self.firstFrameWallMs = wallMs
        }
        self.lastFrameSeconds = elapsedSeconds
        if !self.posterCaptured, let posterURL = self.posterURL {
          self.capturePoster(from: buffer, to: posterURL)
        }
      }
    }
  }

  private func claimFrameSlot() -> Bool {
    inFlightLock.lock()
    defer { inFlightLock.unlock() }
    if isFrameInFlight { return false }
    isFrameInFlight = true
    return true
  }

  private func releaseFrameSlot() {
    inFlightLock.lock()
    isFrameInFlight = false
    inFlightLock.unlock()
  }

  /// Real elapsed time keeps playback at the speed it happened. The gap caps the
  /// clip to the target fps, with slack so a timer firing a few milliseconds early
  /// is not dropped (that would cut the clip to about half the target rate).
  private func isDueForFrame(at elapsedSeconds: Double) -> Bool {
    guard elapsedSeconds <= maxDurationSeconds else { return false }
    guard let lastFrameSeconds else { return true }
    let slack = minimumFrameGapSeconds * 0.2
    return elapsedSeconds - lastFrameSeconds + slack >= minimumFrameGapSeconds
  }

  /// Draws the camera (aspect-filled, optionally mirrored) and proof chrome into `buffer`.
  private func renderFrame(cameraFrame: CVPixelBuffer, into buffer: CVPixelBuffer) -> Bool {
    let target = CGSize(width: targetWidth, height: targetHeight)
    var camera = CIImage(cvPixelBuffer: cameraFrame)
    // Capture buffers stay sensor-landscape even when the connection is
    // portrait. Rotate into portrait before aspect-fill so we do not upscale
    // a centre crop of a landscape frame into 1080×1920.
    camera = Self.portraitImage(camera, mirrored: mirrorsCamera)
    let filled = Self.aspectFill(camera, into: target)
    imageContext.render(filled, to: buffer)

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return false }
    guard let context = CGContext(
      data: base,
      width: targetWidth,
      height: targetHeight,
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
      return false
    }
    // CGContext origin is bottom-left; flip so UIKit chrome lays out top-down.
    context.translateBy(x: 0, y: CGFloat(targetHeight))
    context.scaleBy(x: 1, y: -1)
    UIGraphicsPushContext(context)
    Self.drawProofChrome(overlay, in: CGRect(origin: .zero, size: target))
    UIGraphicsPopContext()
    return true
  }

  private func capturePoster(from buffer: CVPixelBuffer, to url: URL) {
    let image = CIImage(cvPixelBuffer: buffer)
    guard let cgImage = imageContext.createCGImage(image, from: image.extent) else { return }
    let poster = UIImage(cgImage: cgImage)
    guard let jpeg = poster.jpegData(compressionQuality: Self.posterJpegQuality) else { return }
    try? jpeg.write(to: url, options: .atomic)
    posterCaptured = true
  }

  /// Rotates a landscape sensor buffer to portrait; mirrors for the front camera.
  private static func portraitImage(_ image: CIImage, mirrored: Bool) -> CIImage {
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else { return image }
    if extent.width > extent.height {
      // Back: 90° CW. Front: 90° CCW + mirror so the file matches the preview.
      return image.oriented(mirrored ? .leftMirrored : .right)
    }
    if mirrored {
      return image.oriented(.upMirrored)
    }
    return image
  }

  /// Scales `image` to cover `size`, centre-cropped.
  private static func aspectFill(_ image: CIImage, into size: CGSize) -> CIImage {
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else { return image }
    let scale = max(size.width / extent.width, size.height / extent.height)
    let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let scaledExtent = scaled.extent
    let origin = CGPoint(
      x: scaledExtent.midX - size.width / 2,
      y: scaledExtent.midY - size.height / 2
    )
    return scaled
      .cropped(to: CGRect(origin: origin, size: size))
      .transformed(by: CGAffineTransform(translationX: -origin.x, y: -origin.y))
  }

  struct FinishResult {
    let fileURL: URL
    let posterURL: URL?
    /// Last ≤15s cut for Stories / Status; nil when the full clip is already short.
    let socialFileURL: URL?
    let sha256Hex: String
    let byteSize: Int
    let durationSeconds: Int
  }

  func finish(endAtWallMs: Double? = nil, completion: @escaping (Result<FinishResult, Error>) -> Void) {
    guard isRecording, let writer, let input, let outputURL else {
      completion(.failure(ProofRecorderError.notRecording))
      return
    }

    if let endAtWallMs {
      self.endAtWallMs = endAtWallMs
    }

    let tempPosterURL = posterURL
    let posterWasCaptured = posterCaptured
    let trimmedLastSeconds: Double = {
      guard let endAt = self.endAtWallMs, let firstWall = self.firstFrameWallMs else {
        return self.lastFrameSeconds ?? 0
      }
      let endSeconds = max(0, (endAt - firstWall) / 1000.0)
      return min(self.lastFrameSeconds ?? endSeconds, endSeconds)
    }()
    isRecording = false
    writeQueue.async {
      input.markAsFinished()
      writer.finishWriting {
        if writer.status != .completed {
          completion(.failure(writer.error ?? ProofRecorderError.finishFailed))
          self.clearWriterState()
          return
        }

        do {
          let durableVideo = try Self.moveToApplicationSupport(from: outputURL, kind: "clip")
          var durablePoster: URL?
          if posterWasCaptured, let tempPosterURL {
            durablePoster = try? Self.moveToApplicationSupport(from: tempPosterURL, kind: "poster")
          }

          let data = try Data(contentsOf: durableVideo, options: [.mappedIfSafe])
          var digest = SHA256()
          digest.update(data: data)
          let hash = digest.finalize().map { String(format: "%02x", $0) }.joined()
          let duration = max(1, Int(trimmedLastSeconds.rounded(.up)))
          let socialURL = Self.exportSocialCut(
            from: durableVideo,
            durationSeconds: Double(duration)
          )
          let result = FinishResult(
            fileURL: durableVideo,
            posterURL: durablePoster,
            socialFileURL: socialURL,
            sha256Hex: hash,
            byteSize: data.count,
            durationSeconds: duration
          )
          self.clearWriterState()
          completion(.success(result))
        } catch {
          self.clearWriterState()
          completion(.failure(error))
        }
      }
    }
  }

  /**
   * Last `socialCutMaxSeconds` of the finished clip for Stories / Status.
   * Remuxes the master so frame rate and bitrate stay intact. A high-quality
   * re-encode is only the fallback when passthrough cannot trim.
   * Returns nil when the full clip is already within that length, or when
   * export fails — callers then share the full file.
   */
  private static func exportSocialCut(from source: URL, durationSeconds: Double) -> URL? {
    guard durationSeconds > socialCutMaxSeconds else {
      return nil
    }

    let start = max(0, durationSeconds - socialCutMaxSeconds)
    let timeRange = CMTimeRange(
      start: CMTime(seconds: start, preferredTimescale: timescale),
      duration: CMTime(seconds: socialCutMaxSeconds, preferredTimescale: timescale)
    )
    if let remuxed = writeSocialCut(
      from: source,
      timeRange: timeRange,
      presetName: AVAssetExportPresetPassthrough
    ) {
      return remuxed
    }
    return writeSocialCut(
      from: source,
      timeRange: timeRange,
      presetName: AVAssetExportPresetHighestQuality
    )
  }

  /// Trims `source` to `timeRange` with the given preset. Nil when export does not finish.
  private static func writeSocialCut(from source: URL, timeRange: CMTimeRange, presetName: String) -> URL? {
    let asset = AVURLAsset(url: source)
    guard let export = AVAssetExportSession(asset: asset, presetName: presetName) else {
      return nil
    }

    let stamp = Int(Date().timeIntervalSince1970 * 1000)
    guard let directory = try? durableDirectory() else {
      return nil
    }
    let destination = directory.appendingPathComponent("social-\(stamp).mp4")
    if FileManager.default.fileExists(atPath: destination.path) {
      try? FileManager.default.removeItem(at: destination)
    }
    export.outputURL = destination
    export.outputFileType = .mp4
    export.timeRange = timeRange

    let gate = DispatchSemaphore(value: 0)
    export.exportAsynchronously {
      gate.signal()
    }
    _ = gate.wait(timeout: .now() + 30)

    guard export.status == .completed else {
      try? FileManager.default.removeItem(at: destination)
      return nil
    }
    return destination
  }

  /// Where finished clips live. iOS moves the app container on reinstall and update,
  /// so JS rebuilds stored file URIs against this rather than trusting old absolute paths.
  static func durableDirectory() throws -> URL {
    let support = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = support.appendingPathComponent("proof-clips", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    var directoryForBackup = directory
    try directoryForBackup.setResourceValues(resourceValues)
    return directory
  }

  /// Moves a finished temp file into Application Support so iOS will not purge it.
  private static func moveToApplicationSupport(from source: URL, kind: String) throws -> URL {
    let directory = try durableDirectory()
    let stamp = Int(Date().timeIntervalSince1970 * 1000)
    let ext = source.pathExtension.isEmpty ? (kind == "poster" ? "jpg" : "mp4") : source.pathExtension
    let destination = directory.appendingPathComponent("\(kind)-\(stamp).\(ext)")
    if FileManager.default.fileExists(atPath: destination.path) {
      try FileManager.default.removeItem(at: destination)
    }
    try FileManager.default.moveItem(at: source, to: destination)
    return destination
  }

  func cancel() {
    stopWithoutFinishing()
  }

  private func stopWithoutFinishing() {
    isRecording = false
    input?.markAsFinished()
    writer?.cancelWriting()
    if let outputURL, FileManager.default.fileExists(atPath: outputURL.path) {
      try? FileManager.default.removeItem(at: outputURL)
    }
    clearWriterState()
  }

  private func clearWriterState() {
    writer = nil
    input = nil
    adaptor = nil
    firstFrameAt = nil
    lastFrameSeconds = nil
  }

  /// Overlay layout was tuned at 720×1280; scale from frame height so env
  /// encoding size does not shrink chips relative to the picture.
  private static let chromeBaselineHeight: CGFloat = 1280

  /// Mark only (no word). SVG mark is 161×167 inside a 219×250 lockup.
  private static let brandLockupHeight: CGFloat = 40
  private static let brandLockupAspect: CGFloat = 161.0 / 167.0
  /// Fractional crop of BeatsetWordmarkWhite.png matching the SVG mark region.
  private static let brandMarkSource = CGRect(
    x: 29.0 / 219.0,
    y: 0,
    width: 161.0 / 219.0,
    height: 167.0 / 250.0
  )

  private struct ChromeMetrics {
    let edgeInset: CGFloat
    let topInset: CGFloat
    let bottomInset: CGFloat
    let chipPadding: UIEdgeInsets
    let chipCornerRadius: CGFloat
    let lineGap: CGFloat
    let pipSize: CGFloat
    let pipGap: CGFloat
    let lockupSize: CGSize
    let codeFont: UIFont
    let urlFont: UIFont
    let countFont: UIFont
    let dateFont: UIFont

    init(scale: CGFloat) {
      edgeInset = 28 * scale
      topInset = 40 * scale
      bottomInset = 56 * scale
      chipPadding = UIEdgeInsets(
        top: 10 * scale,
        left: 16 * scale,
        bottom: 10 * scale,
        right: 16 * scale
      )
      chipCornerRadius = 14 * scale
      lineGap = 3 * scale
      pipSize = 12 * scale
      pipGap = 10 * scale
      let lockupHeight = brandLockupHeight * scale
      lockupSize = CGSize(width: lockupHeight * brandLockupAspect, height: lockupHeight)
      codeFont = UIFont.monospacedSystemFont(ofSize: 20 * scale, weight: .semibold)
      urlFont = UIFont.systemFont(ofSize: 14 * scale, weight: .medium)
      countFont = UIFont.systemFont(ofSize: 28 * scale, weight: .bold)
      dateFont = UIFont.systemFont(ofSize: 16 * scale, weight: .medium)
    }
  }

  private enum Chrome {
    static let chipFill = UIColor.black.withAlphaComponent(0.55)
    static var markImage: UIImage?

    static let dateFormatter: DateFormatter = {
      let formatter = DateFormatter()
      formatter.dateStyle = .medium
      formatter.timeStyle = .none
      return formatter
    }()
  }

  private static func drawProofChrome(_ proof: Overlay, in rect: CGRect) {
    let metrics = ChromeMetrics(scale: rect.height / chromeBaselineHeight)
    drawBrandChip(in: rect, metrics: metrics)
    drawCodeChip(code: proof.code, in: rect, metrics: metrics)
    drawCountChip(proof, in: rect, metrics: metrics)
  }

  /// Top-left: recording pip and white mark (no word).
  private static func drawBrandChip(in rect: CGRect, metrics: ChromeMetrics) {
    let padding = metrics.chipPadding
    let lockup = metrics.lockupSize
    let chip = CGRect(
      x: metrics.edgeInset,
      y: metrics.topInset,
      width: padding.left + metrics.pipSize + metrics.pipGap + lockup.width + padding.right,
      height: padding.top + lockup.height + padding.bottom
    )
    fillChip(chip, cornerRadius: metrics.chipCornerRadius)

    let pip = CGRect(
      x: chip.minX + padding.left,
      y: chip.midY - metrics.pipSize / 2,
      width: metrics.pipSize,
      height: metrics.pipSize
    )
    UIColor.systemRed.setFill()
    UIBezierPath(ovalIn: pip).fill()

    let lockupRect = CGRect(
      x: pip.maxX + metrics.pipGap,
      y: chip.midY - lockup.height / 2,
      width: lockup.width,
      height: lockup.height
    )
    brandMark()?.draw(in: lockupRect)
  }

  private static func brandMark() -> UIImage? {
    if let cached = Chrome.markImage {
      return cached
    }
    let image = loadBrandMark()
    Chrome.markImage = image
    return image
  }

  /// Crops the full lockup asset to the mark region (word left out).
  private static func loadBrandMark() -> UIImage? {
    let owner = Bundle(for: BundleToken.self)
    let full: UIImage?
    if let url = owner.url(forResource: "HealthyQuickPoseCamera", withExtension: "bundle"),
       let resourceBundle = Bundle(url: url)
    {
      full = UIImage(named: "BeatsetWordmarkWhite", in: resourceBundle, compatibleWith: nil)
    } else {
      full = UIImage(named: "BeatsetWordmarkWhite", in: owner, compatibleWith: nil)
    }
    guard let full, let cgImage = full.cgImage else { return full }
    let pixelWidth = CGFloat(cgImage.width)
    let pixelHeight = CGFloat(cgImage.height)
    let crop = CGRect(
      x: brandMarkSource.minX * pixelWidth,
      y: brandMarkSource.minY * pixelHeight,
      width: brandMarkSource.width * pixelWidth,
      height: brandMarkSource.height * pixelHeight
    ).integral
    guard let cropped = cgImage.cropping(to: crop) else { return full }
    return UIImage(cgImage: cropped, scale: full.scale, orientation: full.imageOrientation)
  }

  private final class BundleToken {}

  /// Top-right: code and verify URL so anyone watching knows where to check it.
  private static func drawCodeChip(code: String, in rect: CGRect, metrics: ChromeMetrics) {
    let codeLine = code as NSString
    let urlLine = "beatset.tech/v/\(code)" as NSString
    let codeAttributes = textAttributes(font: metrics.codeFont)
    let urlAttributes = textAttributes(font: metrics.urlFont, alpha: 0.85)
    let codeSize = codeLine.size(withAttributes: codeAttributes)
    let urlSize = urlLine.size(withAttributes: urlAttributes)
    let padding = metrics.chipPadding
    let width = padding.left + max(codeSize.width, urlSize.width) + padding.right
    let chip = CGRect(
      x: rect.width - metrics.edgeInset - width,
      y: metrics.topInset,
      width: width,
      height: padding.top + codeSize.height + metrics.lineGap + urlSize.height + padding.bottom
    )
    fillChip(chip, cornerRadius: metrics.chipCornerRadius)

    let rightEdge = chip.maxX - padding.right
    let codeTop = chip.minY + padding.top
    codeLine.draw(
      at: CGPoint(x: rightEdge - codeSize.width, y: codeTop),
      withAttributes: codeAttributes
    )
    urlLine.draw(
      at: CGPoint(x: rightEdge - urlSize.width, y: codeTop + codeSize.height + metrics.lineGap),
      withAttributes: urlAttributes
    )
  }

  /// Bottom-centre: live count, label, and date.
  private static func drawCountChip(_ proof: Overlay, in rect: CGRect, metrics: ChromeMetrics) {
    let countLine = "\(proof.count)  ·  \(proof.label)" as NSString
    let dateLine = Chrome.dateFormatter.string(from: Date()) as NSString
    let countAttributes = textAttributes(font: metrics.countFont)
    let dateAttributes = textAttributes(font: metrics.dateFont, alpha: 0.85)
    let countSize = countLine.size(withAttributes: countAttributes)
    let dateSize = dateLine.size(withAttributes: dateAttributes)
    let padding = metrics.chipPadding
    let width = padding.left + max(countSize.width, dateSize.width) + padding.right
    let height = padding.top + countSize.height + metrics.lineGap + dateSize.height + padding.bottom
    let chip = CGRect(
      x: (rect.width - width) / 2,
      y: rect.height - metrics.bottomInset - height,
      width: width,
      height: height
    )
    fillChip(chip, cornerRadius: metrics.chipCornerRadius)

    let countTop = chip.minY + padding.top
    countLine.draw(
      at: CGPoint(x: chip.midX - countSize.width / 2, y: countTop),
      withAttributes: countAttributes
    )
    dateLine.draw(
      at: CGPoint(x: chip.midX - dateSize.width / 2, y: countTop + countSize.height + metrics.lineGap),
      withAttributes: dateAttributes
    )
  }

  private static func fillChip(_ chip: CGRect, cornerRadius: CGFloat) {
    Chrome.chipFill.setFill()
    UIBezierPath(roundedRect: chip, cornerRadius: cornerRadius).fill()
  }

  private static func textAttributes(font: UIFont, alpha: CGFloat = 1) -> [NSAttributedString.Key: Any] {
    [.font: font, .foregroundColor: UIColor.white.withAlphaComponent(alpha)]
  }
}

enum ProofRecorderError: Error {
  case cannotAddInput
  case startFailed
  case notRecording
  case finishFailed
}
