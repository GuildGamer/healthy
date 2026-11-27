import AVFoundation
import UIKit

/**
 * Owns the capture session for pose counting and proof clips.
 * QuickPose receives frames as a sample-buffer delegate; it does not open the camera.
 *
 * Format: largest 16:9 buffer at or under 1920×1080 that supports 30 fps.
 * Front-camera buffers stay unmirrored for the model; the preview layer mirrors.
 */
final class PoseCameraSession {
  private(set) var session: AVCaptureSession?

  private let useFrontCamera: Bool
  private let processingQueue = DispatchQueue(label: "healthy.pose-camera", qos: .userInitiated)
  private var device: AVCaptureDevice?
  private var output = AVCaptureVideoDataOutput()

  private static let targetWidth: Int32 = 1920
  private static let targetHeight: Int32 = 1080
  private static let targetFrameRate: Double = 30

  init(useFrontCamera: Bool) {
    self.useFrontCamera = useFrontCamera
  }

  func start(delegate: AVCaptureVideoDataOutputSampleBufferDelegate) throws {
    // Tear down any prior session on this instance before reopening the device.
    if let existing = detachSession() {
      if existing.isRunning {
        existing.stopRunning()
      }
      existing.inputs.forEach(existing.removeInput)
      existing.outputs.forEach(existing.removeOutput)
    }

    guard let captureDevice = AVCaptureDevice.default(
      .builtInWideAngleCamera,
      for: .video,
      position: useFrontCamera ? .front : .back
    ) else {
      throw PoseCameraSessionError.noCamera
    }

    let captureSession = AVCaptureSession()
    let input = try AVCaptureDeviceInput(device: captureDevice)
    guard captureSession.canAddInput(input) else {
      throw PoseCameraSessionError.cannotAddInput
    }
    captureSession.addInput(input)

    output.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    ]
    output.alwaysDiscardsLateVideoFrames = true
    guard captureSession.canAddOutput(output) else {
      throw PoseCameraSessionError.cannotAddOutput
    }
    captureSession.addOutput(output)

    try Self.selectFormat(on: captureDevice, frameRate: Self.targetFrameRate)
    Self.applyOrientation(to: output)

    // Keep ML buffers unmirrored; the preview layer mirrors the front camera.
    if let connection = output.connection(with: .video), connection.isVideoMirroringSupported {
      connection.automaticallyAdjustsVideoMirroring = false
      connection.isVideoMirrored = false
    }

    device = captureDevice
    session = captureSession
    output.setSampleBufferDelegate(delegate, queue: processingQueue)

    processingQueue.async {
      captureSession.startRunning()
    }
  }

  /// Clears the session reference without stopping it. The view tears the
  /// session down on its serial queue after detaching the preview layer.
  @discardableResult
  func detachSession() -> AVCaptureSession? {
    output.setSampleBufferDelegate(nil, queue: nil)
    let captureSession = session
    session = nil
    device = nil
    output = AVCaptureVideoDataOutput()
    return captureSession
  }

  func stop() {
    guard let captureSession = detachSession() else { return }
    processingQueue.async {
      if captureSession.isRunning {
        captureSession.stopRunning()
      }
      captureSession.inputs.forEach(captureSession.removeInput)
      captureSession.outputs.forEach(captureSession.removeOutput)
    }
  }

  /// Prefer 1920×1080 at 30 fps; otherwise the closest 16:9 size ≤ 1920 wide.
  private static func selectFormat(on device: AVCaptureDevice, frameRate: Double) throws {
    let candidates = device.formats.filter { format in
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      guard dimensions.width <= targetWidth, dimensions.height <= targetHeight else {
        return false
      }
      let isSixteenByNine =
        abs((Double(dimensions.width) / Double(dimensions.height)) - (16.0 / 9.0)) < 0.02
      guard isSixteenByNine else { return false }
      return format.videoSupportedFrameRateRanges.contains { range in
        range.minFrameRate <= frameRate && frameRate <= range.maxFrameRate
      }
    }

    guard let selected = candidates.max(by: { left, right in
      let leftSize = CMVideoFormatDescriptionGetDimensions(left.formatDescription)
      let rightSize = CMVideoFormatDescriptionGetDimensions(right.formatDescription)
      return leftSize.width * leftSize.height < rightSize.width * rightSize.height
    }) else {
      throw PoseCameraSessionError.noSuitableFormat
    }

    try device.lockForConfiguration()
    device.activeFormat = selected
    let duration = CMTime(value: 1, timescale: CMTimeScale(frameRate))
    device.activeVideoMinFrameDuration = duration
    device.activeVideoMaxFrameDuration = duration
    device.unlockForConfiguration()
  }

  private static func applyOrientation(to output: AVCaptureVideoDataOutput) {
    guard let connection = output.connection(with: .video),
          connection.isVideoOrientationSupported
    else {
      return
    }
    let deviceOrientation = UIDevice.current.orientation
    if deviceOrientation.isValidInterfaceOrientation,
       let videoOrientation = AVCaptureVideoOrientation(rawValue: deviceOrientation.rawValue)
    {
      connection.videoOrientation = videoOrientation
    } else {
      connection.videoOrientation = .portrait
    }
  }
}

enum PoseCameraSessionError: Error {
  case noCamera
  case cannotAddInput
  case cannotAddOutput
  case noSuitableFormat
}
