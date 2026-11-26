package expo.modules.quickposecamera

import ai.quickpose.camera.getPreviewOutputSize
import ai.quickpose.core.QuickPose
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.media.Image
import android.media.ImageReader
import android.opengl.GLES20
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.Gravity
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.google.mediapipe.glutil.EglManager
import java.util.concurrent.Executor
import java.util.concurrent.atomic.AtomicReference
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.max
import kotlin.math.roundToInt
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Owns the Camera2 session for pose counting and proof clips.
 * QuickPose receives frames via [QuickPose.onCameraStarted]; it does not open the camera.
 *
 * Targets: preview surface, ML SurfaceTexture, and an ImageReader for proof encoding.
 * Format: largest 16:9 size at or under 1920 wide (same helper QuickPose uses).
 */
internal class PoseCameraSession(
  context: Context,
  private val quickPose: QuickPose,
  private val useFrontCamera: Boolean,
) : FrameLayout(context) {
  private val previewView = SurfaceView(context)
  private val overlayView = SurfaceView(context)
  private val previewReady = CompletableDeferred<Surface>()

  private var cameraThread: HandlerThread? = null
  private var cameraHandler: Handler? = null
  private var camera: CameraDevice? = null
  private var session: CameraCaptureSession? = null
  private var imageReader: ImageReader? = null
  private var mlTexture: SurfaceTexture? = null
  private var mlSurface: Surface? = null
  private var sensorOrientation = 0
  private var cameraSize = Size(1920, 1080)
  private val latestProofFrame = AtomicReference<ProofCameraFrame?>(null)

  var isRunning = false
    private set

  /** When false, ImageReader frames are drained without copying. */
  @Volatile
  var isCapturingProof = false

  init {
    previewView.holder.addCallback(
      object : SurfaceHolder.Callback {
        override fun surfaceCreated(holder: SurfaceHolder) {
          if (!previewReady.isCompleted) {
            previewReady.complete(holder.surface)
          }
        }

        override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) = Unit

        override fun surfaceDestroyed(holder: SurfaceHolder) = Unit
      },
    )
    addView(
      previewView,
      LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER),
    )
    addView(
      overlayView,
      LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER),
    )
  }

  /**
   * Opens the camera and wires QuickPose. Returns the landscape camera size.
   */
  @SuppressLint("MissingPermission")
  suspend fun start(): Size {
    if (isRunning) return cameraSize

    val thread = HandlerThread("healthy.pose-camera").also { it.start() }
    cameraThread = thread
    cameraHandler = Handler(thread.looper)

    if (previewView.holder.surface?.isValid == true && !previewReady.isCompleted) {
      previewReady.complete(previewView.holder.surface)
    }
    previewReady.await()

    val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    val cameraId = selectCameraId(manager, useFrontCamera)
    val characteristics = manager.getCameraCharacteristics(cameraId)
    sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0

    val selected =
      getPreviewOutputSize(
        previewView.width.coerceAtLeast(1),
        previewView.height.coerceAtLeast(1),
        characteristics,
        SurfaceTexture::class.java,
      ).let { size ->
        // Cap at 1920×1080 even if the helper returns larger on some devices.
        if (size.width <= MAX_WIDTH) size else Size(MAX_WIDTH, MAX_HEIGHT)
      }
    cameraSize = selected
    previewView.holder.setFixedSize(selected.width, selected.height)
    sizePreviewToCamera(selected)

    val opened = openCamera(manager, cameraId, cameraHandler)
    camera = opened

    val texture = createSurfaceTexture()
    mlTexture = texture
    val textureSurface = Surface(texture)
    mlSurface = textureSurface

    val reader =
      ImageReader.newInstance(selected.width, selected.height, ImageFormat.YUV_420_888, IMAGE_READER_MAX_IMAGES)
    imageReader = reader
    reader.setOnImageAvailableListener({ available ->
      val image = available.acquireLatestImage() ?: return@setOnImageAvailableListener
      try {
        // Drain when idle or when the encoder has not taken the previous frame
        // so we do not allocate NV21 copies faster than we can encode.
        if (!isCapturingProof || latestProofFrame.get() != null) {
          return@setOnImageAvailableListener
        }
        latestProofFrame.set(
          ProofCameraFrame(
            nv21 = imageToNv21(image),
            width = image.width,
            height = image.height,
            capturedAtNanos = System.nanoTime(),
          ),
        )
      } finally {
        image.close()
      }
    }, cameraHandler)

    val previewSurface = previewView.holder.surface
    val readerSurface = reader.surface
    val requestBuilder =
      opened.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
        addTarget(previewSurface)
        addTarget(textureSurface)
        addTarget(readerSurface)
      }
    characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)
      ?.firstOrNull { range -> range.lower <= TARGET_FPS && TARGET_FPS <= range.upper }
      ?.let { range ->
        requestBuilder.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, range)
      }
    val request = requestBuilder.build()

    val mainExecutor = ContextCompat.getMainExecutor(context)
    session =
      createCaptureSession(
        camera = opened,
        surfaces = listOf(previewSurface, textureSurface, readerSurface),
        executor = mainExecutor,
      ).also { captureSession ->
        captureSession.setRepeatingRequest(request, null, cameraHandler)
      }

    texture.detachFromGLContext()
    val upscale =
      max(
        width.toFloat() / selected.height.toFloat(),
        height.toFloat() / selected.width.toFloat(),
      )
    // QuickPose expects portrait dimensions (height × width of the landscape buffer).
    quickPose.onCameraStarted(
      useFrontCamera,
      Size(selected.height, selected.width),
      upscale,
    )
    texture.setOnFrameAvailableListener(quickPose)
    quickPose.setOverlayView(overlayView)

    isRunning = true
    return selected
  }

  /** Newest camera frame for proof encoding, or null when none is ready. */
  fun takeProofFrame(): ProofCameraFrame? = latestProofFrame.getAndSet(null)

  /**
   * Rotation to apply to ImageReader frames so the clip is upright on a
   * portrait phone. Face-up / unknown display rotation is treated as portrait.
   */
  fun proofOrientationDegrees(): Int {
    val displayRotation =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        context.display?.rotation ?: Surface.ROTATION_0
      } else {
        @Suppress("DEPRECATION")
        (context.getSystemService(Context.WINDOW_SERVICE) as android.view.WindowManager)
          .defaultDisplay
          .rotation
      }
    val degrees =
      when (displayRotation) {
        Surface.ROTATION_0 -> 0
        Surface.ROTATION_90 -> 90
        Surface.ROTATION_180 -> 180
        Surface.ROTATION_270 -> 270
        else -> 0
      }
    return if (useFrontCamera) {
      (sensorOrientation + degrees) % 360
    } else {
      (sensorOrientation - degrees + 360) % 360
    }
  }

  fun stop() {
    isRunning = false
    isCapturingProof = false
    latestProofFrame.set(null)
    try {
      session?.close()
    } catch (_: Exception) {
    }
    session = null
    try {
      camera?.close()
    } catch (_: Exception) {
    }
    camera = null
    imageReader?.close()
    imageReader = null
    mlSurface?.release()
    mlSurface = null
    mlTexture?.release()
    mlTexture = null
    cameraThread?.quitSafely()
    cameraThread = null
    cameraHandler = null
  }

  private fun sizePreviewToCamera(size: Size) {
    val cameraAspect = size.width.toFloat() / size.height.toFloat()
    previewView.post {
      val viewWidth = width.takeIf { it > 0 } ?: return@post
      val viewHeight = height.takeIf { it > 0 } ?: return@post
      val fitHeight = (viewWidth * cameraAspect).roundToInt()
      val params =
        if (fitHeight >= viewHeight) {
          LayoutParams(viewWidth, fitHeight, Gravity.CENTER)
        } else {
          LayoutParams((viewHeight / cameraAspect).roundToInt(), viewHeight, Gravity.CENTER)
        }
      previewView.layoutParams = params
      overlayView.layoutParams = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    }
  }

  private companion object {
    const val TAG = "HealthyPoseCamera"
    const val MAX_WIDTH = 1920
    const val MAX_HEIGHT = 1080
    const val TARGET_FPS = 30
    const val IMAGE_READER_MAX_IMAGES = 2

    fun selectCameraId(manager: CameraManager, useFrontCamera: Boolean): String {
      val facing =
        if (useFrontCamera) {
          CameraCharacteristics.LENS_FACING_FRONT
        } else {
          CameraCharacteristics.LENS_FACING_BACK
        }
      return manager.cameraIdList.firstOrNull { id ->
        manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) == facing
      }
        ?: manager.cameraIdList.firstOrNull()
        ?: throw IllegalStateException("No camera available on this device.")
    }

    @SuppressLint("MissingPermission")
    suspend fun openCamera(
      manager: CameraManager,
      cameraId: String,
      handler: Handler?,
    ): CameraDevice =
      suspendCancellableCoroutine { continuation ->
        manager.openCamera(
          cameraId,
          object : CameraDevice.StateCallback() {
            override fun onOpened(device: CameraDevice) {
              continuation.resume(device)
            }

            override fun onDisconnected(device: CameraDevice) {
              Log.w(TAG, "Camera $cameraId disconnected")
              device.close()
            }

            override fun onError(device: CameraDevice, error: Int) {
              device.close()
              if (continuation.isActive) {
                continuation.resumeWithException(RuntimeException("Camera $cameraId error $error"))
              }
            }
          },
          handler,
        )
      }

    suspend fun createCaptureSession(
      camera: CameraDevice,
      surfaces: List<Surface>,
      executor: Executor,
    ): CameraCaptureSession =
      suspendCancellableCoroutine { continuation ->
        val callback =
          object : CameraCaptureSession.StateCallback() {
            override fun onConfigured(session: CameraCaptureSession) {
              continuation.resume(session)
            }

            override fun onConfigureFailed(session: CameraCaptureSession) {
              if (continuation.isActive) {
                continuation.resumeWithException(
                  RuntimeException("Camera session configuration failed"),
                )
              }
            }
          }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          val configs = surfaces.map { OutputConfiguration(it) }
          val config =
            SessionConfiguration(
              SessionConfiguration.SESSION_REGULAR,
              configs,
              executor,
              callback,
            )
          camera.createCaptureSession(config)
        } else {
          @Suppress("DEPRECATION")
          camera.createCaptureSession(surfaces, callback, null)
        }
      }

    fun createSurfaceTexture(): SurfaceTexture {
      val eglManager = EglManager(null)
      val tempSurface = eglManager.createOffscreenSurface(1, 1)
      eglManager.makeCurrent(tempSurface, tempSurface)
      val textures = IntArray(1)
      GLES20.glGenTextures(1, textures, 0)
      return SurfaceTexture(textures[0])
    }

    /** Packs a YUV_420_888 Image into NV21 for JPEG decode / Bitmap creation. */
    fun imageToNv21(image: Image): ByteArray {
      val width = image.width
      val height = image.height
      val ySize = width * height
      val nv21 = ByteArray(ySize + ySize / 2)
      val yBuffer = image.planes[0].buffer
      val uBuffer = image.planes[1].buffer
      val vBuffer = image.planes[2].buffer
      val yRowStride = image.planes[0].rowStride
      val yPixelStride = image.planes[0].pixelStride
      var output = 0
      for (row in 0 until height) {
        val yRowStart = row * yRowStride
        for (col in 0 until width) {
          nv21[output++] = yBuffer.get(yRowStart + col * yPixelStride)
        }
      }
      val uvRowStride = image.planes[2].rowStride
      val uvPixelStride = image.planes[2].pixelStride
      val chromaHeight = height / 2
      val chromaWidth = width / 2
      for (row in 0 until chromaHeight) {
        val vRowStart = row * uvRowStride
        val uRowStart = row * image.planes[1].rowStride
        for (col in 0 until chromaWidth) {
          nv21[output++] = vBuffer.get(vRowStart + col * uvPixelStride)
          nv21[output++] = uBuffer.get(uRowStart + col * image.planes[1].pixelStride)
        }
      }
      return nv21
    }
  }
}

/** One camera sample ready for proof encoding. */
internal data class ProofCameraFrame(
  val nv21: ByteArray,
  val width: Int,
  val height: Int,
  val capturedAtNanos: Long,
)

/**
 * Builds a portrait ARGB bitmap from a camera frame, rotated and optionally
 * mirrored, aspect-filled into [destWidth]×[destHeight].
 */
internal fun ProofCameraFrame.toPortraitBitmap(
  destWidth: Int,
  destHeight: Int,
  sensorOrientation: Int,
  mirror: Boolean,
): android.graphics.Bitmap? {
  val yuv =
    android.graphics.YuvImage(nv21, ImageFormat.NV21, width, height, null)
  val jpeg = java.io.ByteArrayOutputStream()
  if (!yuv.compressToJpeg(android.graphics.Rect(0, 0, width, height), 95, jpeg)) {
    return null
  }
  val bytes = jpeg.toByteArray()
  var working =
    android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
  if (sensorOrientation % 360 != 0) {
    val matrix = Matrix().apply { postRotate(sensorOrientation.toFloat()) }
    val rotated =
      android.graphics.Bitmap.createBitmap(working, 0, 0, working.width, working.height, matrix, true)
    if (rotated !== working) {
      working.recycle()
    }
    working = rotated
  }
  if (mirror) {
    val matrix = Matrix().apply { preScale(-1f, 1f) }
    val mirrored =
      android.graphics.Bitmap.createBitmap(working, 0, 0, working.width, working.height, matrix, true)
    if (mirrored !== working) {
      working.recycle()
    }
    working = mirrored
  }
  val dest = android.graphics.Bitmap.createBitmap(destWidth, destHeight, android.graphics.Bitmap.Config.ARGB_8888)
  val canvas = android.graphics.Canvas(dest)
  canvas.drawColor(android.graphics.Color.BLACK)
  val scale =
    max(destWidth.toFloat() / working.width, destHeight.toFloat() / working.height)
  val drawWidth = working.width * scale
  val drawHeight = working.height * scale
  val left = (destWidth - drawWidth) / 2f
  val top = (destHeight - drawHeight) / 2f
  canvas.drawBitmap(
    working,
    null,
    android.graphics.RectF(left, top, left + drawWidth, top + drawHeight),
    android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG),
  )
  if (working !== dest) {
    working.recycle()
  }
  return dest
}
