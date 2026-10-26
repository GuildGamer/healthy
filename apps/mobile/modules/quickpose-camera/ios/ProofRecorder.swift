import AVFoundation
import CoreImage
import CryptoKit
import UIKit
import VideoToolbox

/**
 * Writes a muted HEVC clip of the plain camera image. The skeleton stays on
 * the live preview only.
 *
 * Proof chrome (wordmark, verification code, live rep count, date) is burned
 * in before encoding so the exported file is self-evidencing. A poster JPEG is
 * captured from the first written frame.
 *
 * Camera frames are not mirrored (QuickPose keeps ML input raw) but the front
 * preview is, so a front-camera frame is mirrored to match what the person saw.
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
  private var startedAt: CFTimeInterval = 0
  private var lastFrameSeconds: Double?
  private var outputURL: URL?
  private var posterURL: URL?
  private var posterCaptured = false
  private var mirrorsCamera = false
  private var maxDurationSeconds: Double = 0
  private var overlay = Overlay(code: "", label: "", count: 0)
  private let writeQueue = DispatchQueue(label: "healthy.proof-recorder")
  private let imageContext = CIContext()

  private static let targetWidth = 720
  private static let targetHeight = 1280
  /// 90 s at this rate stays under the contract's PROOF_CLIP_MAX_BYTES (12 MB).
  private static let bitRate = 1_000_000
  private static let minimumFrameGapSeconds = 1.0 / 15.0
  private static let timescale: CMTimeScale = 600

  func start(overlay: Overlay, mirrorsCamera: Bool, maxDurationSeconds: Double) throws {
    stopWithoutFinishing()

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
      AVVideoCodecKey: AVVideoCodecType.hevc,
      AVVideoWidthKey: Self.targetWidth,
      AVVideoHeightKey: Self.targetHeight,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: Self.bitRate,
        AVVideoProfileLevelKey: kVTProfileLevel_HEVC_Main_AutoLevel,
      ],
    ]

    let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    videoInput.expectsMediaDataInRealTime = true

    let pixelAdaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: videoInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: Self.targetWidth,
        kCVPixelBufferHeightKey as String: Self.targetHeight,
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
    startedAt = CACurrentMediaTime()
    lastFrameSeconds = nil
    outputURL = videoURL
    posterURL = poster
    posterCaptured = false
    self.mirrorsCamera = mirrorsCamera
    self.maxDurationSeconds = maxDurationSeconds
    self.overlay = overlay
    isRecording = true
  }

  func updateOverlay(code: String? = nil, label: String? = nil, count: Int? = nil) {
    if let code { overlay.code = code }
    if let label { overlay.label = label }
    if let count { overlay.count = count }
  }

  /// Appends one composited frame. Safe to call from the QuickPose frame callback.
  /// A frame without a camera image is skipped rather than written as black.
  func append(cameraFrame: CVPixelBuffer?) {
    guard isRecording, let writer, writer.status == .writing, let cameraFrame else { return }
    let elapsedSeconds = CACurrentMediaTime() - startedAt

    writeQueue.async { [weak self] in
      guard let self, self.isRecording else { return }
      guard let input = self.input, input.isReadyForMoreMediaData else { return }
      guard let adaptor = self.adaptor else { return }
      guard self.isDueForFrame(at: elapsedSeconds) else { return }
      guard let camera = self.cameraImage(from: cameraFrame) else { return }

      let composed = Self.compose(
        camera: camera,
        proof: self.overlay,
        size: CGSize(width: Self.targetWidth, height: Self.targetHeight)
      )

      guard let buffer = Self.pixelBuffer(from: composed) else { return }
      let time = CMTime(seconds: elapsedSeconds, preferredTimescale: Self.timescale)

      if adaptor.append(buffer, withPresentationTime: time) {
        self.lastFrameSeconds = elapsedSeconds
        if !self.posterCaptured, let posterURL = self.posterURL,
           let jpeg = composed.jpegData(compressionQuality: 0.7)
        {
          try? jpeg.write(to: posterURL, options: .atomic)
          self.posterCaptured = true
        }
      }
    }
  }

  /// Real elapsed time keeps playback at the speed it happened; the gap caps the clip at 15 fps.
  private func isDueForFrame(at elapsedSeconds: Double) -> Bool {
    guard elapsedSeconds <= maxDurationSeconds else { return false }
    guard let lastFrameSeconds else { return true }
    return elapsedSeconds - lastFrameSeconds >= Self.minimumFrameGapSeconds
  }

  private func cameraImage(from frame: CVPixelBuffer) -> UIImage? {
    var image = CIImage(cvPixelBuffer: frame)
    if mirrorsCamera {
      image = image.oriented(.upMirrored)
    }
    guard let cgImage = imageContext.createCGImage(image, from: image.extent) else { return nil }
    return UIImage(cgImage: cgImage)
  }

  struct FinishResult {
    let fileURL: URL
    let posterURL: URL?
    let sha256Hex: String
    let byteSize: Int
    let durationSeconds: Int
  }

  func finish(completion: @escaping (Result<FinishResult, Error>) -> Void) {
    guard isRecording, let writer, let input, let outputURL else {
      completion(.failure(ProofRecorderError.notRecording))
      return
    }

    let tempPosterURL = posterURL
    let posterWasCaptured = posterCaptured
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
          let duration = max(1, Int((self.lastFrameSeconds ?? 0).rounded(.up)))
          let result = FinishResult(
            fileURL: durableVideo,
            posterURL: durablePoster,
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

  /// Moves a finished temp file into Application Support so iOS will not purge it.
  private static func moveToApplicationSupport(from source: URL, kind: String) throws -> URL {
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
    lastFrameSeconds = nil
  }

  private static func compose(
    camera: UIImage,
    proof: Overlay,
    size: CGSize
  ) -> UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { context in
      UIColor.black.setFill()
      context.fill(CGRect(origin: .zero, size: size))

      drawAspectFill(camera, in: CGRect(origin: .zero, size: size))
      drawProofChrome(proof, in: CGRect(origin: .zero, size: size))
    }
  }

  private static func drawAspectFill(_ image: UIImage, in rect: CGRect) {
    let imageSize = image.size
    guard imageSize.width > 0, imageSize.height > 0 else { return }
    let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
    let drawSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
    let origin = CGPoint(
      x: rect.midX - drawSize.width / 2,
      y: rect.midY - drawSize.height / 2
    )
    image.draw(in: CGRect(origin: origin, size: drawSize))
  }

  private enum Chrome {
    static let edgeInset: CGFloat = 28
    static let topInset: CGFloat = 40
    static let bottomInset: CGFloat = 56
    static let chipPadding = UIEdgeInsets(top: 10, left: 16, bottom: 10, right: 16)
    static let chipCornerRadius: CGFloat = 14
    static let chipFill = UIColor.black.withAlphaComponent(0.55)
    static let lineGap: CGFloat = 3
    static let pipSize: CGFloat = 12
    static let pipGap: CGFloat = 10

    static let brandFont = UIFont.systemFont(ofSize: 20, weight: .heavy)
    static let codeFont = UIFont.monospacedSystemFont(ofSize: 20, weight: .semibold)
    static let urlFont = UIFont.systemFont(ofSize: 14, weight: .medium)
    static let countFont = UIFont.systemFont(ofSize: 28, weight: .bold)
    static let dateFont = UIFont.systemFont(ofSize: 16, weight: .medium)

    static let dateFormatter: DateFormatter = {
      let formatter = DateFormatter()
      formatter.dateStyle = .medium
      formatter.timeStyle = .none
      return formatter
    }()
  }

  private static func drawProofChrome(_ proof: Overlay, in rect: CGRect) {
    drawBrandChip(in: rect)
    drawCodeChip(code: proof.code, in: rect)
    drawCountChip(proof, in: rect)
  }

  /// Top-left: recording pip and wordmark.
  private static func drawBrandChip(in rect: CGRect) {
    let brand = "Healthy" as NSString
    let attributes = textAttributes(font: Chrome.brandFont)
    let textSize = brand.size(withAttributes: attributes)
    let padding = Chrome.chipPadding
    let chip = CGRect(
      x: Chrome.edgeInset,
      y: Chrome.topInset,
      width: padding.left + Chrome.pipSize + Chrome.pipGap + textSize.width + padding.right,
      height: padding.top + textSize.height + padding.bottom
    )
    fillChip(chip)

    let pip = CGRect(
      x: chip.minX + padding.left,
      y: chip.midY - Chrome.pipSize / 2,
      width: Chrome.pipSize,
      height: Chrome.pipSize
    )
    UIColor.systemRed.setFill()
    UIBezierPath(ovalIn: pip).fill()

    brand.draw(
      at: CGPoint(x: pip.maxX + Chrome.pipGap, y: chip.midY - textSize.height / 2),
      withAttributes: attributes
    )
  }

  /// Top-right: code and verify URL so anyone watching knows where to check it.
  private static func drawCodeChip(code: String, in rect: CGRect) {
    let codeLine = code as NSString
    let urlLine = "gethealthyapp.com/v/\(code)" as NSString
    let codeAttributes = textAttributes(font: Chrome.codeFont)
    let urlAttributes = textAttributes(font: Chrome.urlFont, alpha: 0.85)
    let codeSize = codeLine.size(withAttributes: codeAttributes)
    let urlSize = urlLine.size(withAttributes: urlAttributes)
    let padding = Chrome.chipPadding
    let width = padding.left + max(codeSize.width, urlSize.width) + padding.right
    let chip = CGRect(
      x: rect.width - Chrome.edgeInset - width,
      y: Chrome.topInset,
      width: width,
      height: padding.top + codeSize.height + Chrome.lineGap + urlSize.height + padding.bottom
    )
    fillChip(chip)

    let rightEdge = chip.maxX - padding.right
    let codeTop = chip.minY + padding.top
    codeLine.draw(
      at: CGPoint(x: rightEdge - codeSize.width, y: codeTop),
      withAttributes: codeAttributes
    )
    urlLine.draw(
      at: CGPoint(x: rightEdge - urlSize.width, y: codeTop + codeSize.height + Chrome.lineGap),
      withAttributes: urlAttributes
    )
  }

  /// Bottom-centre: live count, label, and date.
  private static func drawCountChip(_ proof: Overlay, in rect: CGRect) {
    let countLine = "\(proof.count)  ·  \(proof.label)" as NSString
    let dateLine = Chrome.dateFormatter.string(from: Date()) as NSString
    let countAttributes = textAttributes(font: Chrome.countFont)
    let dateAttributes = textAttributes(font: Chrome.dateFont, alpha: 0.85)
    let countSize = countLine.size(withAttributes: countAttributes)
    let dateSize = dateLine.size(withAttributes: dateAttributes)
    let padding = Chrome.chipPadding
    let width = padding.left + max(countSize.width, dateSize.width) + padding.right
    let height = padding.top + countSize.height + Chrome.lineGap + dateSize.height + padding.bottom
    let chip = CGRect(
      x: (rect.width - width) / 2,
      y: rect.height - Chrome.bottomInset - height,
      width: width,
      height: height
    )
    fillChip(chip)

    let countTop = chip.minY + padding.top
    countLine.draw(
      at: CGPoint(x: chip.midX - countSize.width / 2, y: countTop),
      withAttributes: countAttributes
    )
    dateLine.draw(
      at: CGPoint(x: chip.midX - dateSize.width / 2, y: countTop + countSize.height + Chrome.lineGap),
      withAttributes: dateAttributes
    )
  }

  private static func fillChip(_ chip: CGRect) {
    Chrome.chipFill.setFill()
    UIBezierPath(roundedRect: chip, cornerRadius: Chrome.chipCornerRadius).fill()
  }

  private static func textAttributes(font: UIFont, alpha: CGFloat = 1) -> [NSAttributedString.Key: Any] {
    [.font: font, .foregroundColor: UIColor.white.withAlphaComponent(alpha)]
  }

  private static func pixelBuffer(from image: UIImage) -> CVPixelBuffer? {
    guard let cgImage = image.cgImage else { return nil }
    let width = cgImage.width
    let height = cgImage.height
    var buffer: CVPixelBuffer?
    let attrs: [CFString: Any] = [
      kCVPixelBufferCGImageCompatibilityKey: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey: true,
    ]
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      width,
      height,
      kCVPixelFormatType_32BGRA,
      attrs as CFDictionary,
      &buffer
    )
    guard status == kCVReturnSuccess, let pixelBuffer = buffer else { return nil }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard let context = CGContext(
      data: CVPixelBufferGetBaseAddress(pixelBuffer),
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
      return nil
    }

    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pixelBuffer
  }
}

enum ProofRecorderError: Error {
  case cannotAddInput
  case startFailed
  case notRecording
  case finishFailed
}
