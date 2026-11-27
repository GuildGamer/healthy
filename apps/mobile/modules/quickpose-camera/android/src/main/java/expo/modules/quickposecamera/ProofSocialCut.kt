package expo.modules.quickposecamera

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.nio.ByteBuffer

/**
 * Copies the last `maxSeconds` of a finished proof clip into a new MP4 for
 * Stories / Status. Remux only — no re-encode — so it stays fast on device.
 */
internal object ProofSocialCut {
  fun exportLastSeconds(source: File, destination: File, maxSeconds: Double): File {
    if (destination.exists()) {
      destination.delete()
    }

    val extractor = MediaExtractor()
    extractor.setDataSource(source.path)
    try {
      val trackIndex = selectVideoTrack(extractor)
      if (trackIndex < 0) {
        throw IllegalStateException("Proof clip has no video track.")
      }
      extractor.selectTrack(trackIndex)
      val format = extractor.getTrackFormat(trackIndex)
      val durationUs = format.getLong(MediaFormat.KEY_DURATION)
      val startUs = maxOf(0L, durationUs - (maxSeconds * 1_000_000.0).toLong())
      extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

      val muxer = MediaMuxer(destination.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      try {
        val muxerTrack = muxer.addTrack(format)
        muxer.start()
        val buffer = ByteBuffer.allocate(1024 * 1024)
        val info = MediaCodec.BufferInfo()
        var firstPresentationUs = -1L

        while (true) {
          val sampleSize = extractor.readSampleData(buffer, 0)
          if (sampleSize < 0) {
            break
          }
          if (firstPresentationUs < 0) {
            firstPresentationUs = extractor.sampleTime
          }
          info.offset = 0
          info.size = sampleSize
          info.presentationTimeUs = (extractor.sampleTime - firstPresentationUs).coerceAtLeast(0)
          info.flags = extractor.sampleFlags
          muxer.writeSampleData(muxerTrack, buffer, info)
          extractor.advance()
        }
      } finally {
        runCatching { muxer.stop() }
        muxer.release()
      }
    } finally {
      extractor.release()
    }

    if (!destination.exists() || destination.length() == 0L) {
      destination.delete()
      throw IllegalStateException("Social cut was empty.")
    }
    return destination
  }

  private fun selectVideoTrack(extractor: MediaExtractor): Int {
    for (index in 0 until extractor.trackCount) {
      val mime = extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME) ?: continue
      if (mime.startsWith("video/")) {
        return index
      }
    }
    return -1
  }
}
