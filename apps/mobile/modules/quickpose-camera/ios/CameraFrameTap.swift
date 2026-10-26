import AVFoundation
import QuickPoseCore

/**
 * Sits between the camera and QuickPose. Every frame still reaches QuickPose
 * unchanged; while a proof clip records, the newest camera frame is also kept
 * so the clip is real camera footage.
 *
 * `AVCaptureVideoPreviewLayer` cannot be snapshotted (`render(in:)` draws
 * black), so the clip has to be built from these buffers.
 */
final class CameraFrameTap: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  private weak var quickPose: QuickPose?
  private let lock = NSLock()
  private var latestFrame: CVPixelBuffer?
  private var isKeepingFrames = false

  init(quickPose: QuickPose) {
    self.quickPose = quickPose
  }

  /// Start or stop holding on to frames; off releases the held buffer.
  func setKeepingFrames(_ keeping: Bool) {
    lock.lock()
    isKeepingFrames = keeping
    if !keeping {
      latestFrame = nil
    }
    lock.unlock()
  }

  func newestFrame() -> CVPixelBuffer? {
    lock.lock()
    defer { lock.unlock() }
    return latestFrame
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    keepIfRecording(sampleBuffer)
    quickPose?.captureOutput(output, didOutput: sampleBuffer, from: connection)
  }

  private func keepIfRecording(_ sampleBuffer: CMSampleBuffer) {
    lock.lock()
    defer { lock.unlock() }
    guard isKeepingFrames, let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }
    latestFrame = pixelBuffer
  }
}
