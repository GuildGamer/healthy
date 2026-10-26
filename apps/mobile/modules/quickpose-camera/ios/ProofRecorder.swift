import AVFoundation
import CoreImage
import CryptoKit
import UIKit
import VideoToolbox

/**
 * Writes a muted HEVC clip of the camera with QuickPose's skeleton on top.
 *
 * Overlay (logo label, verification code, live rep count, date) is burned in
 * before encoding so the exported file is self-evidencing. A poster JPEG is
 * captured from the first written frame.
 *
 * Camera frames are not mirrored (QuickPose keeps ML input raw) but the front
 * preview and QuickPose's overlay are, so a front-camera frame is mirrored
 * before the overlay is drawn on it.
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
  func append(cameraFrame: CVPixelBuffer?, overlayImage: UIImage?) {
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
        overlay: overlayImage,
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
    overlay: UIImage?,
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
      if let overlay {
        drawAspectFill(overlay, in: CGRect(origin: .zero, size: size))
      }

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

  private static func drawProofChrome(_ proof: Overlay, in rect: CGRect) {
    let padding: CGFloat = 24
    let chipHeight: CGFloat = 36

    // Top-left: Healthy wordmark chip
    let brand = "Healthy" as NSString
    let brandAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 16, weight: .heavy),
      .foregroundColor: UIColor.white,
    ]
    let brandSize = brand.size(withAttributes: brandAttrs)
    let brandRect = CGRect(
      x: padding,
      y: padding + 8,
      width: brandSize.width + 24,
      height: chipHeight
    )
    let brandPath = UIBezierPath(roundedRect: brandRect, cornerRadius: 10)
    UIColor.black.withAlphaComponent(0.55).setFill()
    brandPath.fill()
    brand.draw(
      at: CGPoint(x: brandRect.minX + 12, y: brandRect.midY - brandSize.height / 2),
      withAttributes: brandAttrs
    )

    // Top-right: code + verify URL so anyone watching knows where to check it
    let codeLine = proof.code as NSString
    let urlLine = "gethealthyapp.com/v/\(proof.code)" as NSString
    let codeAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.monospacedSystemFont(ofSize: 15, weight: .semibold),
      .foregroundColor: UIColor.white,
    ]
    let urlAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 11, weight: .medium),
      .foregroundColor: UIColor.white.withAlphaComponent(0.85),
    ]
    let codeSize = codeLine.size(withAttributes: codeAttrs)
    let urlSize = urlLine.size(withAttributes: urlAttrs)
    let chipWidth = max(codeSize.width, urlSize.width) + 24
    let chipBlockHeight = codeSize.height + urlSize.height + 14
    let codeRect = CGRect(
      x: rect.width - padding - chipWidth,
      y: padding + 8,
      width: chipWidth,
      height: max(chipHeight, chipBlockHeight)
    )
    let codePath = UIBezierPath(roundedRect: codeRect, cornerRadius: 10)
    UIColor.black.withAlphaComponent(0.55).setFill()
    codePath.fill()
    let codeY = codeRect.minY + 7
    codeLine.draw(
      at: CGPoint(x: codeRect.maxX - 12 - codeSize.width, y: codeY),
      withAttributes: codeAttrs
    )
    urlLine.draw(
      at: CGPoint(x: codeRect.maxX - 12 - urlSize.width, y: codeY + codeSize.height + 2),
      withAttributes: urlAttrs
    )

    // Bottom-centre: live count + label + date
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .none
    let dateLine = dateFormatter.string(from: Date())
    let countLine = "\(proof.count)  ·  \(proof.label)" as NSString
    let countAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 22, weight: .bold),
      .foregroundColor: UIColor.white,
    ]
    let dateAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 13, weight: .medium),
      .foregroundColor: UIColor.white.withAlphaComponent(0.85),
    ]
    let countSize = countLine.size(withAttributes: countAttrs)
    let dateSize = (dateLine as NSString).size(withAttributes: dateAttrs)
    let blockWidth = max(countSize.width, dateSize.width) + 32
    let blockHeight = countSize.height + dateSize.height + 20
    let blockRect = CGRect(
      x: (rect.width - blockWidth) / 2,
      y: rect.height - padding - blockHeight - 24,
      width: blockWidth,
      height: blockHeight
    )
    let blockPath = UIBezierPath(roundedRect: blockRect, cornerRadius: 14)
    UIColor.black.withAlphaComponent(0.55).setFill()
    blockPath.fill()
    countLine.draw(
      at: CGPoint(x: blockRect.midX - countSize.width / 2, y: blockRect.minY + 8),
      withAttributes: countAttrs
    )
    (dateLine as NSString).draw(
      at: CGPoint(x: blockRect.midX - dateSize.width / 2, y: blockRect.minY + 8 + countSize.height + 2),
      withAttributes: dateAttrs
    )

    // Recording pip
    let pip = CGRect(x: rect.width - padding - 14, y: padding + 54, width: 10, height: 10)
    UIColor.systemRed.setFill()
    UIBezierPath(ovalIn: pip).fill()
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
