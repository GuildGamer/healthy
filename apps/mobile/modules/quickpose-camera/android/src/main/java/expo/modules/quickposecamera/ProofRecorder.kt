package expo.modules.quickposecamera

import ai.quickpose.core.QuickPose
import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.view.SurfaceView
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/**
 * Writes a muted proof clip of the plain camera image, matching the iOS
 * recorder: the skeleton stays on the live preview only, proof chrome is
 * burned in before encoding, and a poster JPEG comes from the first frame.
 *
 * Frames are copied from the camera surface (what the person sees), capped
 * at 15 fps, with at most one frame in flight so capture never backs up the
 * camera or QuickPose. Call from the main thread; encoding runs on its own.
 */
internal class ProofRecorder(private val context: Context) {
  data class FinishResult(
    val videoFile: File,
    val posterFile: File?,
    val sha256Hex: String,
    val byteSize: Long,
    val durationSeconds: Int,
  )

  /** State of one clip. Touched only on the recorder thread after `start`. */
  private class Clip(
    val videoFile: File,
    val posterFile: File,
    val encoder: ProofClipEncoder,
    val maxDurationSeconds: Double,
  ) {
    var firstFrameAtNanos: Long? = null
    var firstFrameWallMs: Long? = null
    var lastFrameSeconds: Double? = null
    var isPosterCaptured = false
  }

  private val thread = HandlerThread("healthy.proof-recorder").apply { start() }
  private val handler = Handler(thread.looper)
  private val isFrameInFlight = AtomicBoolean(false)
  private val frame: Bitmap by lazy { Bitmap.createBitmap(TARGET_WIDTH, TARGET_HEIGHT, Bitmap.Config.ARGB_8888) }
  private var clip: Clip? = null
  private var lastCaptureRequestNanos = 0L

  @Volatile
  var isRecording = false
    private set

  @Volatile
  private var overlay = ProofOverlay(code = "", label = "", count = 0)

  /** Wall-clock end of the set; frames after this are dropped and the duration is trimmed to it. */
  @Volatile
  private var endAtWallMs: Long? = null

  fun start(initialOverlay: ProofOverlay, maxDurationSeconds: Double) {
    cancel()
    val stamp = System.currentTimeMillis()
    val directory = File(context.cacheDir, PROOF_CLIPS_FOLDER).apply { mkdirs() }
    val videoFile = File(directory, "clip-$stamp.mp4")
    val posterFile = File(directory, "poster-$stamp.jpg")
    val encoder = ProofClipEncoder(videoFile, TARGET_WIDTH, TARGET_HEIGHT)

    overlay = initialOverlay
    endAtWallMs = null
    lastCaptureRequestNanos = 0L
    val nextClip = Clip(videoFile, posterFile, encoder, maxDurationSeconds)
    handler.post { clip = nextClip }
    isRecording = true
  }

  fun updateOverlay(code: String? = null, label: String? = null, count: Int? = null) {
    val current = overlay
    overlay = current.copy(
      code = code ?: current.code,
      label = label ?: current.label,
      count = count ?: current.count,
    )
  }

  /** Requests a copy of the camera surface when the next frame is due. A failed copy is skipped, never written black. */
  fun captureFrom(cameraSurface: SurfaceView) {
    if (!isRecording) return
    val requestedAtNanos = SystemClock.elapsedRealtimeNanos()
    if (requestedAtNanos - lastCaptureRequestNanos < MINIMUM_FRAME_GAP_NANOS) return
    if (!isFrameInFlight.compareAndSet(false, true)) return
    lastCaptureRequestNanos = requestedAtNanos

    QuickPose.captureFrame(cameraSurface, null) { cameraImage ->
      if (cameraImage == null) {
        isFrameInFlight.set(false)
        return@captureFrame
      }
      handler.post {
        try {
          writeFrame(cameraImage, requestedAtNanos)
        } finally {
          cameraImage.recycle()
          isFrameInFlight.set(false)
        }
      }
    }
  }

  /** Ends the clip; `completion` runs on the recorder thread. */
  fun finish(endAtMs: Long?, completion: (Result<FinishResult>) -> Unit) {
    if (!isRecording) {
      completion(Result.failure(IllegalStateException("Proof clip is not recording.")))
      return
    }
    if (endAtMs != null) {
      endAtWallMs = endAtMs
    }
    isRecording = false
    handler.post {
      val finishing = clip
      clip = null
      if (finishing == null) {
        completion(Result.failure(IllegalStateException("Proof clip is not recording.")))
        return@post
      }
      completion(runCatching { finishClip(finishing) })
    }
  }

  /** Stops without keeping anything. */
  fun cancel() {
    isRecording = false
    handler.post {
      val cancelled = clip ?: return@post
      clip = null
      cancelled.encoder.release()
      cancelled.videoFile.delete()
      cancelled.posterFile.delete()
    }
  }

  /** Cancels any clip and stops the recorder thread once queued work is done. */
  fun shutdown() {
    cancel()
    thread.quitSafely()
  }

  private fun writeFrame(cameraImage: Bitmap, capturedAtNanos: Long) {
    val active = clip ?: return
    if (!isRecording) return
    val wallMs = System.currentTimeMillis()
    val endAt = endAtWallMs
    if (endAt != null && wallMs > endAt) return
    val elapsedSeconds = active.firstFrameAtNanos?.let { (capturedAtNanos - it) / NANOS_PER_SECOND } ?: 0.0
    if (elapsedSeconds > active.maxDurationSeconds) return

    ProofChrome.compose(frame, cameraImage, overlay)
    try {
      active.encoder.drawFrame(frame)
    } catch (error: Exception) {
      return
    }

    if (active.firstFrameAtNanos == null) {
      active.firstFrameAtNanos = capturedAtNanos
      active.firstFrameWallMs = wallMs
    }
    active.lastFrameSeconds = elapsedSeconds
    capturePosterOnce(active)
  }

  private fun capturePosterOnce(active: Clip) {
    if (active.isPosterCaptured) return
    active.isPosterCaptured = runCatching {
      active.posterFile.outputStream().use { stream ->
        frame.compress(Bitmap.CompressFormat.JPEG, POSTER_JPEG_QUALITY, stream)
      }
    }.getOrDefault(false)
  }

  private fun finishClip(finished: Clip): FinishResult {
    val hasFrames = finished.encoder.finish()
    if (!hasFrames) {
      finished.videoFile.delete()
      finished.posterFile.delete()
      throw IllegalStateException("Proof clip has no frames.")
    }

    val durableVideo = moveToDurableDirectory(finished.videoFile, kind = "clip", extension = "mp4")
    val durablePoster = if (finished.isPosterCaptured) {
      runCatching { moveToDurableDirectory(finished.posterFile, kind = "poster", extension = "jpg") }.getOrNull()
    } else {
      null
    }
    return FinishResult(
      videoFile = durableVideo,
      posterFile = durablePoster,
      sha256Hex = sha256Hex(durableVideo),
      byteSize = durableVideo.length(),
      durationSeconds = trimmedDurationSeconds(finished),
    )
  }

  private fun trimmedDurationSeconds(finished: Clip): Int {
    val lastFrameSeconds = finished.lastFrameSeconds ?: 0.0
    val endAt = endAtWallMs
    val firstWallMs = finished.firstFrameWallMs
    val seconds = if (endAt == null || firstWallMs == null) {
      lastFrameSeconds
    } else {
      min(lastFrameSeconds, max(0.0, (endAt - firstWallMs) / MILLIS_PER_SECOND))
    }
    return max(1, ceil(seconds).toInt())
  }

  private fun moveToDurableDirectory(source: File, kind: String, extension: String): File {
    val destination = File(durableDirectory(context), "$kind-${System.currentTimeMillis()}.$extension")
    if (destination.exists()) {
      destination.delete()
    }
    if (!source.renameTo(destination)) {
      source.copyTo(destination, overwrite = true)
      source.delete()
    }
    return destination
  }

  companion object {
    private const val PROOF_CLIPS_FOLDER = "proof-clips"
    private const val TARGET_WIDTH = 720
    private const val TARGET_HEIGHT = 1280
    private const val POSTER_JPEG_QUALITY = 70
    private const val NANOS_PER_SECOND = 1_000_000_000.0
    private const val MILLIS_PER_SECOND = 1_000.0
    private const val MINIMUM_FRAME_GAP_NANOS = 1_000_000_000L / 15
    private const val HASH_BUFFER_BYTES = 64 * 1024

    /**
     * Where finished clips live. `noBackupFilesDir` survives app updates and is
     * kept out of cloud backup, like the iOS folder. JS rebuilds stored file
     * URIs against this rather than trusting old absolute paths.
     */
    fun durableDirectory(context: Context): File =
      File(context.noBackupFilesDir, PROOF_CLIPS_FOLDER).apply { mkdirs() }

    private fun sha256Hex(file: File): String {
      val digest = MessageDigest.getInstance("SHA-256")
      file.inputStream().use { stream ->
        val buffer = ByteArray(HASH_BUFFER_BYTES)
        while (true) {
          val read = stream.read(buffer)
          if (read < 0) break
          digest.update(buffer, 0, read)
        }
      }
      return digest.digest().joinToString(separator = "") { "%02x".format(it) }
    }
  }
}
