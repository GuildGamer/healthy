package expo.modules.quickposecamera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Log
import android.view.PixelCopy
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
 * Frames are PixelCopied from the camera surface (what the person sees) into
 * the reused clip bitmap with a centre crop, capped to the configured frame
 * rate, with at most one frame in flight so capture never backs up the camera
 * or QuickPose. Call from the main thread; copy + encoding run on the
 * recorder thread.
 */
internal class ProofRecorder(private val context: Context) {
  data class FinishResult(
    val videoFile: File,
    val posterFile: File?,
    val sha256Hex: String,
    val byteSize: Long,
    val durationSeconds: Int,
  )

  data class Encoding(
    val bitRate: Int,
    val frameRate: Int,
    val width: Int,
    val height: Int,
  )

  /** State of one clip. Touched only on the recorder thread after `start`. */
  private class Clip(
    val videoFile: File,
    val posterFile: File,
    val encoder: ProofClipEncoder,
    val frame: Bitmap,
    val maxDurationSeconds: Double,
    val minimumFrameGapNanos: Long,
  ) {
    var firstFrameAtNanos: Long? = null
    var firstFrameWallMs: Long? = null
    var lastFrameSeconds: Double? = null
    var isPosterCaptured = false
    var framesWritten = 0
    var framesSkipped = 0
  }

  private val thread = HandlerThread("healthy.proof-recorder").apply { start() }
  private val handler = Handler(thread.looper)
  private val isFrameInFlight = AtomicBoolean(false)
  private var clip: Clip? = null
  private var lastCaptureRequestNanos = 0L
  private var minimumFrameGapNanos = NANOS_PER_SECOND_LONG / DEFAULT_FRAME_RATE

  @Volatile
  var isRecording = false
    private set

  @Volatile
  private var overlay = ProofOverlay(code = "", label = "", count = 0)

  /** Wall-clock end of the set; frames after this are dropped and the duration is trimmed to it. */
  @Volatile
  private var endAtWallMs: Long? = null

  fun start(initialOverlay: ProofOverlay, maxDurationSeconds: Double, encoding: Encoding) {
    cancel()
    val width = evenInRange(encoding.width, DEFAULT_WIDTH, WIDTH_MIN, WIDTH_MAX)
    val height = evenInRange(encoding.height, DEFAULT_HEIGHT, HEIGHT_MIN, HEIGHT_MAX)
    val bitRate = clamp(encoding.bitRate, DEFAULT_BIT_RATE, BIT_RATE_MIN, BIT_RATE_MAX)
    val frameRate = clamp(encoding.frameRate, DEFAULT_FRAME_RATE, FRAME_RATE_MIN, FRAME_RATE_MAX)
    val stamp = System.currentTimeMillis()
    val directory = File(context.cacheDir, PROOF_CLIPS_FOLDER).apply { mkdirs() }
    val videoFile = File(directory, "clip-$stamp.mp4")
    val posterFile = File(directory, "poster-$stamp.jpg")
    val frame = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val encoder = ProofClipEncoder(videoFile, width, height, bitRate, frameRate)
    val gapNanos = NANOS_PER_SECOND_LONG / frameRate

    overlay = initialOverlay
    endAtWallMs = null
    lastCaptureRequestNanos = 0L
    minimumFrameGapNanos = gapNanos
    val nextClip = Clip(videoFile, posterFile, encoder, frame, maxDurationSeconds, gapNanos)
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

  /**
   * Requests a centre-cropped PixelCopy of the camera surface into the clip
   * frame when the next sample is due. A failed copy is skipped, never written black.
   */
  fun captureFrom(cameraSurface: SurfaceView) {
    if (!isRecording) return
    val requestedAtNanos = SystemClock.elapsedRealtimeNanos()
    if (requestedAtNanos - lastCaptureRequestNanos < minimumFrameGapNanos) return
    if (!isFrameInFlight.compareAndSet(false, true)) return
    lastCaptureRequestNanos = requestedAtNanos

    handler.post {
      val active = clip
      if (active == null || !isRecording) {
        isFrameInFlight.set(false)
        return@post
      }
      val surfaceWidth = cameraSurface.width
      val surfaceHeight = cameraSurface.height
      if (surfaceWidth <= 0 || surfaceHeight <= 0) {
        active.framesSkipped += 1
        isFrameInFlight.set(false)
        return@post
      }

      val srcRect =
        centreCropRect(
          surfaceWidth = surfaceWidth,
          surfaceHeight = surfaceHeight,
          destWidth = active.frame.width,
          destHeight = active.frame.height,
        )
      PixelCopy.request(cameraSurface, srcRect, active.frame, { copyResult ->
        try {
          if (copyResult == PixelCopy.SUCCESS) {
            writeFrame(active, requestedAtNanos)
          } else {
            active.framesSkipped += 1
          }
        } finally {
          isFrameInFlight.set(false)
        }
      }, handler)
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
      cancelled.frame.recycle()
      cancelled.videoFile.delete()
      cancelled.posterFile.delete()
    }
  }

  /** Cancels any clip and stops the recorder thread once queued work is done. */
  fun shutdown() {
    cancel()
    thread.quitSafely()
  }

  private fun writeFrame(active: Clip, capturedAtNanos: Long) {
    if (!isRecording) {
      active.framesSkipped += 1
      return
    }
    val wallMs = System.currentTimeMillis()
    val endAt = endAtWallMs
    if (endAt != null && wallMs > endAt) {
      active.framesSkipped += 1
      return
    }
    val elapsedSeconds = active.firstFrameAtNanos?.let { (capturedAtNanos - it) / NANOS_PER_SECOND } ?: 0.0
    if (elapsedSeconds > active.maxDurationSeconds) {
      active.framesSkipped += 1
      return
    }

    ProofChrome.drawChrome(active.frame, overlay)
    try {
      active.encoder.drawFrame(active.frame)
    } catch (error: Exception) {
      active.framesSkipped += 1
      return
    }

    if (active.firstFrameAtNanos == null) {
      active.firstFrameAtNanos = capturedAtNanos
      active.firstFrameWallMs = wallMs
    }
    active.lastFrameSeconds = elapsedSeconds
    active.framesWritten += 1
    capturePosterOnce(active)
  }

  private fun capturePosterOnce(active: Clip) {
    if (active.isPosterCaptured) return
    active.isPosterCaptured = runCatching {
      active.posterFile.outputStream().use { stream ->
        active.frame.compress(Bitmap.CompressFormat.JPEG, POSTER_JPEG_QUALITY, stream)
      }
    }.getOrDefault(false)
  }

  private fun finishClip(finished: Clip): FinishResult {
    Log.i(
      LOG_TAG,
      "proof clip finished written=${finished.framesWritten} skipped=${finished.framesSkipped}",
    )
    val hasFrames = finished.encoder.finish()
    finished.frame.recycle()
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
    private const val LOG_TAG = "HealthyPose"
    private const val PROOF_CLIPS_FOLDER = "proof-clips"
    private const val DEFAULT_WIDTH = 1080
    private const val DEFAULT_HEIGHT = 1920
    private const val DEFAULT_BIT_RATE = 8_000_000
    private const val DEFAULT_FRAME_RATE = 30
    private const val BIT_RATE_MIN = 50_000
    private const val BIT_RATE_MAX = 200_000_000
    private const val FRAME_RATE_MIN = 1
    private const val FRAME_RATE_MAX = 120
    private const val WIDTH_MIN = 256
    private const val WIDTH_MAX = 3840
    private const val HEIGHT_MIN = 256
    private const val HEIGHT_MAX = 3840
    private const val POSTER_JPEG_QUALITY = 70
    private const val NANOS_PER_SECOND = 1_000_000_000.0
    private const val NANOS_PER_SECOND_LONG = 1_000_000_000L
    private const val MILLIS_PER_SECOND = 1_000.0
    private const val HASH_BUFFER_BYTES = 64 * 1024

    /**
     * Largest centre crop of the surface that matches the destination aspect
     * ratio, so PixelCopy GPU-scales the same way aspect-fill used to on the CPU.
     */
    fun centreCropRect(
      surfaceWidth: Int,
      surfaceHeight: Int,
      destWidth: Int,
      destHeight: Int,
    ): Rect {
      val destAspect = destWidth.toFloat() / destHeight.toFloat()
      val surfaceAspect = surfaceWidth.toFloat() / surfaceHeight.toFloat()
      if (surfaceAspect > destAspect) {
        val cropWidth = (surfaceHeight * destAspect).toInt().coerceAtLeast(1)
        val left = ((surfaceWidth - cropWidth) / 2).coerceAtLeast(0)
        return Rect(left, 0, left + cropWidth, surfaceHeight)
      }
      val cropHeight = (surfaceWidth / destAspect).toInt().coerceAtLeast(1)
      val top = ((surfaceHeight - cropHeight) / 2).coerceAtLeast(0)
      return Rect(0, top, surfaceWidth, top + cropHeight)
    }

    /**
     * Where finished clips live. `noBackupFilesDir` survives app updates and is
     * kept out of cloud backup, like the iOS folder. JS rebuilds stored file
     * URIs against this rather than trusting old absolute paths.
     */
    fun durableDirectory(context: Context): File =
      File(context.noBackupFilesDir, PROOF_CLIPS_FOLDER).apply { mkdirs() }

    private fun evenInRange(value: Int, fallback: Int, min: Int, max: Int): Int =
      if (value in min..max && value % 2 == 0) value else fallback

    private fun clamp(value: Int, fallback: Int, min: Int, max: Int): Int =
      if (value in min..max) value else fallback

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
