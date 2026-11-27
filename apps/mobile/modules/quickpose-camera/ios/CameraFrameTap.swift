import AVFoundation
import QuickPoseCore

/**
 * Sits between the app-owned capture session and QuickPose. Every frame still
 * reaches QuickPose unchanged; while a proof clip records, the newest sample
 * is retained so the clip is real camera footage.
 *
 * Callers must keep the `CMSampleBuffer` alive until they finish reading its
 * pixel buffer — retaining only the `CVPixelBuffer` is not enough; the capture
 * pool can reuse that memory once the sample is released.
 *
 * `AVCaptureVideoPreviewLayer` cannot be snapshotted (`render(in:)` draws
 * black), so the clip has to be built from these buffers.
 */
final class CameraFrameTap: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  private weak var quickPose: QuickPose?
  private let lock = NSLock()
  private var latestSampleBuffer: CMSampleBuffer?
  private var isKeepingFrames = false

  init(quickPose: QuickPose) {
    self.quickPose = quickPose
  }

  /// Start or stop holding on to frames; off releases the held sample.
  func setKeepingFrames(_ keeping: Bool) {
    lock.lock()
    isKeepingFrames = keeping
    if !keeping {
      latestSampleBuffer = nil
    }
    lock.unlock()
  }

  /// Hands ownership of the newest sample to the caller. Nil when none is ready.
  func takeSampleBuffer() -> CMSampleBuffer? {
    lock.lock()
    defer { lock.unlock() }
    let sample = latestSampleBuffer
    latestSampleBuffer = nil
    return sample
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
    guard isKeepingFrames else { return }
    latestSampleBuffer = sampleBuffer
  }
}
