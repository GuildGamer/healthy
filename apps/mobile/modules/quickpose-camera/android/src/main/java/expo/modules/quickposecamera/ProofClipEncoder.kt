package expo.modules.quickposecamera

import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.view.Surface
import java.io.File

/**
 * Muted H.264 MP4 writer. Frames are drawn onto the encoder's input surface,
 * which stamps them with the time they were posted, so playback runs at the
 * speed the set happened. Use from a single thread.
 */
internal class ProofClipEncoder(outputFile: File, width: Int, height: Int) {
  private val muxer = MediaMuxer(outputFile.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
  private val codec: MediaCodec = createCodecOrRelease(muxer)
  private val inputSurface: Surface = startCodecOrRelease(codec, muxer, width, height)
  private val bufferInfo = MediaCodec.BufferInfo()
  private var trackIndex = -1
  private var isMuxerStarted = false
  private var firstPresentationUs = -1L
  private var isReleased = false

  /** True once at least one encoded frame reached the file. */
  var hasSamples = false
    private set

  fun drawFrame(frame: Bitmap) {
    val canvas = inputSurface.lockHardwareCanvas()
    try {
      canvas.drawBitmap(frame, 0f, 0f, null)
    } finally {
      inputSurface.unlockCanvasAndPost(canvas)
    }
    drain(isEndOfStream = false)
  }

  /** Flushes the encoder and closes the file. Returns false when no frame was written. */
  fun finish(): Boolean {
    try {
      codec.signalEndOfInputStream()
      drain(isEndOfStream = true)
    } finally {
      release()
    }
    return hasSamples
  }

  fun release() {
    if (isReleased) return
    isReleased = true
    runCatching { codec.stop() }
    codec.release()
    inputSurface.release()
    if (isMuxerStarted && hasSamples) {
      runCatching { muxer.stop() }
    }
    muxer.release()
  }

  private fun drain(isEndOfStream: Boolean) {
    var idleDrains = 0
    while (true) {
      val timeoutUs = if (isEndOfStream) END_OF_STREAM_TIMEOUT_US else 0L
      val index = codec.dequeueOutputBuffer(bufferInfo, timeoutUs)
      if (index == MediaCodec.INFO_TRY_AGAIN_LATER) {
        idleDrains += 1
        if (!isEndOfStream || idleDrains > MAX_END_OF_STREAM_IDLE_DRAINS) return
        continue
      }
      if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
        startMuxer()
        continue
      }
      if (index < 0) continue
      if (writeSample(index)) return
    }
  }

  private fun startMuxer() {
    if (isMuxerStarted) return
    trackIndex = muxer.addTrack(codec.outputFormat)
    muxer.start()
    isMuxerStarted = true
  }

  /** Writes one encoded buffer and returns true at end of stream. */
  private fun writeSample(index: Int): Boolean {
    val buffer = codec.getOutputBuffer(index)
    val isCodecConfig = (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0
    if (buffer != null && !isCodecConfig && bufferInfo.size > 0 && isMuxerStarted) {
      if (firstPresentationUs < 0) {
        firstPresentationUs = bufferInfo.presentationTimeUs
      }
      bufferInfo.presentationTimeUs = (bufferInfo.presentationTimeUs - firstPresentationUs).coerceAtLeast(0)
      buffer.position(bufferInfo.offset)
      buffer.limit(bufferInfo.offset + bufferInfo.size)
      muxer.writeSampleData(trackIndex, buffer, bufferInfo)
      hasSamples = true
    }
    codec.releaseOutputBuffer(index, false)
    return (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0
  }

  private companion object {
    const val MIME_TYPE = MediaFormat.MIMETYPE_VIDEO_AVC
    /** 180 s at this rate stays under the contract's PROOF_CLIP_MAX_BYTES (16 MB). */
    const val BIT_RATE = 650_000
    const val FRAME_RATE = 15
    const val KEYFRAME_INTERVAL_SECONDS = 1
    const val END_OF_STREAM_TIMEOUT_US = 10_000L
    const val MAX_END_OF_STREAM_IDLE_DRAINS = 100

    fun createCodecOrRelease(muxer: MediaMuxer): MediaCodec =
      try {
        MediaCodec.createEncoderByType(MIME_TYPE)
      } catch (error: Exception) {
        muxer.release()
        throw error
      }

    /** Configures and starts the encoder, returning its input surface. Releases both on failure. */
    fun startCodecOrRelease(codec: MediaCodec, muxer: MediaMuxer, width: Int, height: Int): Surface =
      try {
        codec.configure(videoFormat(width, height), null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        val surface = codec.createInputSurface()
        codec.start()
        surface
      } catch (error: Exception) {
        codec.release()
        muxer.release()
        throw error
      }

    fun videoFormat(width: Int, height: Int): MediaFormat =
      MediaFormat.createVideoFormat(MIME_TYPE, width, height).apply {
        setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
        setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
        setInteger(MediaFormat.KEY_FRAME_RATE, FRAME_RATE)
        setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, KEYFRAME_INTERVAL_SECONDS)
      }
  }
}
