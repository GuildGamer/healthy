package expo.modules.quickposecamera

import ai.quickpose.camera.QuickPoseCameraSwitchView
import ai.quickpose.core.Feature
import ai.quickpose.core.FeatureResult
import ai.quickpose.core.Landmarks
import ai.quickpose.core.PoseFeedback
import Point3d
import ai.quickpose.core.QuickPose
import ai.quickpose.core.Side
import ai.quickpose.core.Status
import android.Manifest
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.max
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import ai.quickpose.camera.QuickPoseCameraView as QuickPoseCameraSurface

/**
 * Live pose counting and optional proof clips: the QuickPose camera and
 * skeleton overlay, with each frame's feature results sent to JS as
 * `onUpdate`, and recording driven by the same props and events as iOS.
 */
class QuickPoseCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onUpdate by EventDispatcher<Map<String, Any>>()
  private val onProofRecorded by EventDispatcher<Map<String, Any>>()
  private val onProofRecordingError by EventDispatcher<Map<String, Any>>()

  // React Native does not lay out views added from native code.
  override val shouldUseAndroidLayout = true

  var sdkKey: String = ""
    set(value) {
      if (field == value) return
      field = value
      restart()
    }

  var featureKeys: List<String> = emptyList()
    set(value) {
      field = value
      applyFeatures()
    }

  var featureStyles: Map<String, Any?> = emptyMap()
    set(value) {
      field = value
      applyFeatures()
    }

  /** MatchMetric pose value — drives native threshold/hold/stance. */
  var metric: String = "pushups"
    set(value) {
      if (field == value) return
      field = value
      countEngine.metric = value
    }

  /** Increment to reset the native counter (session reset / non-preserve start). */
  var resetCountToken: Int = 0
    set(value) {
      if (field == value) return
      field = value
      if (value > 0) {
        countEngine.reset()
        lastPublishedCount = -1
        lastPublishedPhase = ""
        lastPublishedCoach = null
      }
    }

  var useFrontCamera: Boolean = true
    set(value) {
      if (field == value) return
      field = value
      restart()
    }

  /** When set, frames are written to a proof clip with this overlay. */
  var proofRecording: Map<String, Any?>? = null
    set(value) {
      field = value
      syncProofRecording()
    }

  /**
   * Optional overlay count override (freeze/review). Live recording burns in
   * [PoseCountEngine.liveCount] by default until [finishProofToken] fires.
   */
  var proofCount: Int = 0
    set(value) {
      field = value
      proofRecorder?.updateOverlay(count = value)
    }

  /** Wall-clock ms of the last rep plus a short tail; 0 keeps the full clip. */
  var finishProofEndAtMs: Double = 0.0

  /** Incremented by JS to finish the in-flight recording (not cancel it). */
  var finishProofToken: Int = 0
    set(value) {
      field = value
      if (value > 0) {
        overlayFromNative = false
        finishProofRecording()
      }
    }

  private var quickPose: QuickPose? = null
  private var cameraView: QuickPoseCameraSwitchView? = null
  private var sessionScope: CoroutineScope? = null
  private var currentFeatures: List<Pair<String, Feature>> = emptyList()
  private var isRequestingPermission = false
  private var isCameraRunning = false
  private var proofRecorder: ProofRecorder? = null
  private val countEngine = PoseCountEngine()
  private val countLock = Any()
  /**
   * iOS taps camera buffers beside QuickPose; Android samples the camera
   * surface on this loop with a cheap PixelCopy so pose inference keeps its
   * full frame rate while a proof clip is recording.
   */
  private val proofCaptureHandler = Handler(Looper.getMainLooper())
  private var proofCaptureTick: Runnable? = null
  private val emitHandler = Handler(Looper.getMainLooper())
  private var pendingEmit: Map<String, Any>? = null
  private var emitScheduled = false
  private var lastEmitMs = 0L
  private var lastPublishedCount = -1
  private var lastPublishedPhase = ""
  private var lastPublishedCoach: String? = null
  @Volatile
  private var lastPoseStatusSuccess = false
  /** Live burn-in until JS finishes the clip (frozen proofCount wins after). */
  @Volatile
  private var overlayFromNative = true
  private var poseSuccessFrames = 0
  private var poseFpsWindowStartMs = 0L

  init {
    setBackgroundColor(Color.BLACK)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    tryStart()
  }

  override fun onDetachedFromWindow() {
    stop()
    super.onDetachedFromWindow()
  }

  private fun tryStart() {
    if (quickPose != null || !isAttachedToWindow || sdkKey.isEmpty()) return

    val mapped = QuickPoseFeatures.map(featureKeys, featureStyles)
    if (mapped.isEmpty()) return
    if (!ensureCameraPermission()) return

    val pose = QuickPose(appContext.currentActivity ?: context, sdkKey)
    val camera = QuickPoseCameraSwitchView(context, pose)
    addView(camera, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    quickPose = pose
    cameraView = camera
    currentFeatures = mapped

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    sessionScope = scope
    scope.launch {
      try {
        camera.start(useFrontCamera)
      } catch (error: Exception) {
        stop()
        return@launch
      }
      isCameraRunning = true
      pose.start(mapped.map { it.second }.toTypedArray(), onFrame = { status, _, results, feedback, landmarks ->
        // Count on the pose callback path — do not wait for main/JS.
        publishFrame(status, results, feedback, landmarks)
      })
      syncProofRecording()
    }
  }

  /** True when the camera may be used now; otherwise asks once and starts on a grant. */
  private fun ensureCameraPermission(): Boolean {
    val permissions = appContext.permissions ?: return false
    if (permissions.hasGrantedPermissions(Manifest.permission.CAMERA)) return true
    if (isRequestingPermission) return false

    isRequestingPermission = true
    permissions.askForPermissions({ result ->
      isRequestingPermission = false
      if (result[Manifest.permission.CAMERA]?.status == PermissionsStatus.GRANTED) {
        post { tryStart() }
      }
    }, Manifest.permission.CAMERA)
    return false
  }

  private fun publishFrame(
    status: Status,
    featureResults: Map<Feature, FeatureResult>,
    feedback: Map<Feature, PoseFeedback>,
    landmarks: Landmarks?,
  ) {
    if (quickPose == null) return

    lastPoseStatusSuccess = status is Status.Success

    if (status !is Status.Success) return

    notePoseSuccessFrame()

    val results = mutableMapOf<String, Double>()
    val feedbacks = mutableMapOf<String, String>()
    for ((key, feature) in currentFeatures) {
      featureResults[feature]?.let { results[key] = it.value.toDouble() }
      feedback[feature]?.displayString?.takeIf { it.isNotEmpty() }?.let { feedbacks[key] = it }
    }

    val stanceFrame = stanceFrame(landmarks)
    val landmarksAvailable = landmarks != null
    val snapshot =
      synchronized(countLock) {
        countEngine.process(
          results = results,
          feedbacks = feedbacks,
          frame = stanceFrame,
          landmarksAvailable = landmarksAvailable,
          nowMs = System.currentTimeMillis(),
        )
      }

    val liveCount = snapshot.count
    if (overlayFromNative && snapshot.countChanged && proofRecorder?.isRecording == true) {
      post { proofRecorder?.updateOverlay(count = liveCount) }
    }

    val payload =
      mapOf(
        "results" to results,
        "feedbacks" to feedbacks,
        "landmarks" to landmarksPayload(stanceFrame),
        "landmarksAvailable" to landmarksAvailable,
        "count" to liveCount,
        "phase" to snapshot.phase,
        "bodyInFrame" to snapshot.bodyInFrame,
        "tooClose" to snapshot.tooClose,
        "coachPrompt" to (snapshot.coachPrompt ?: ""),
        "measure" to (snapshot.measure ?: -1.0),
      )
    coalesceEmit(payload, snapshot.countChanged, snapshot)
  }

  /** Latest-wins JS emit: immediate on count change, else ~30 Hz. */
  private fun coalesceEmit(
    payload: Map<String, Any>,
    countChanged: Boolean,
    snapshot: PoseCountEngine.Snapshot,
  ) {
    val now = System.currentTimeMillis()
    val phaseChanged = snapshot.phase != lastPublishedPhase
    val coachChanged = snapshot.coachPrompt != lastPublishedCoach
    val due = countChanged || phaseChanged || coachChanged || now - lastEmitMs >= EMIT_MIN_INTERVAL_MS
    pendingEmit = payload
    if (countChanged) {
      flushEmit()
      return
    }
    if (!due) {
      if (!emitScheduled) {
        emitScheduled = true
        emitHandler.postDelayed({ flushEmit() }, EMIT_MIN_INTERVAL_MS)
      }
      return
    }
    flushEmit()
  }

  private fun flushEmit() {
    emitScheduled = false
    val payload = pendingEmit ?: return
    pendingEmit = null
    lastEmitMs = System.currentTimeMillis()
    lastPublishedCount = (payload["count"] as? Number)?.toInt() ?: lastPublishedCount
    lastPublishedPhase = payload["phase"] as? String ?: lastPublishedPhase
    val coach = payload["coachPrompt"] as? String
    lastPublishedCoach = coach?.takeIf { it.isNotEmpty() }
    post { onUpdate(payload) }
  }

  private fun stanceFrame(landmarks: Landmarks?): PoseStanceFrame? {
    if (landmarks == null) {
      return null
    }
    val out = linkedMapOf<String, PoseStance.Point>()
    fun put(key: String, body: Landmarks.Body) {
      val point: Point3d = landmarks.landmarkForBody(body)
      if (point.visibility < LANDMARK_MIN_VISIBILITY) {
        return
      }
      out[key] =
        PoseStance.Point(
          x = point.x.toDouble(),
          y = point.y.toDouble(),
          score = point.visibility.toDouble(),
        )
    }
    put("nose", Landmarks.Body.Nose())
    put("leftShoulder", Landmarks.Body.Shoulder(Side.LEFT))
    put("rightShoulder", Landmarks.Body.Shoulder(Side.RIGHT))
    put("leftElbow", Landmarks.Body.Elbow(Side.LEFT))
    put("rightElbow", Landmarks.Body.Elbow(Side.RIGHT))
    put("leftWrist", Landmarks.Body.Wrist(Side.LEFT))
    put("rightWrist", Landmarks.Body.Wrist(Side.RIGHT))
    put("leftHip", Landmarks.Body.Hip(Side.LEFT))
    put("rightHip", Landmarks.Body.Hip(Side.RIGHT))
    put("leftKnee", Landmarks.Body.Knee(Side.LEFT))
    put("rightKnee", Landmarks.Body.Knee(Side.RIGHT))
    put("leftAnkle", Landmarks.Body.Ankle(Side.LEFT))
    put("rightAnkle", Landmarks.Body.Ankle(Side.RIGHT))
    return out
  }

  /** Compact joint map for JS debug. Missing / low-visibility joints are omitted. */
  private fun landmarksPayload(frame: PoseStanceFrame?): Map<String, Map<String, Double>> {
    if (frame == null) {
      return emptyMap()
    }
    return frame.mapValues { (_, point) ->
      mapOf("x" to point.x, "y" to point.y, "score" to point.score)
    }
  }

  /** The visible camera surface inside the switch view; the skeleton draws on a separate overlay surface. */
  private fun activeCameraSurface(): SurfaceView? {
    val camera = cameraView ?: return null
    val surfaces = (0 until camera.childCount)
      .map { camera.getChildAt(it) }
      .filterIsInstance<QuickPoseCameraSurface>()
    return surfaces.firstOrNull { it.visibility == View.VISIBLE } ?: surfaces.firstOrNull()
  }

  private fun syncProofRecording() {
    if (!isCameraRunning) return

    val config = proofRecording
    val code = config?.get("code") as? String
    val maxDurationSeconds = (config?.get("maxDurationSeconds") as? Number)?.toDouble()
    val label = config?.get("label") as? String ?: ""
    if (code.isNullOrEmpty() || maxDurationSeconds == null) {
      cancelProofRecording()
      return
    }

    val existing = proofRecorder
    val liveCount = synchronized(countLock) { countEngine.liveCount() }

    if (existing != null && existing.isRecording) {
      existing.updateOverlay(code = code, label = label, count = liveCount)
      return
    }

    startProofRecording(
      ProofOverlay(code, label, liveCount),
      maxDurationSeconds,
      ProofRecorder.Encoding(
        bitRate = intValue(config["bitRate"], DEFAULT_BIT_RATE),
        frameRate = intValue(config["frameRate"], DEFAULT_FRAME_RATE),
        width = intValue(config["width"], DEFAULT_WIDTH),
        height = intValue(config["height"], DEFAULT_HEIGHT),
      ),
    )
  }

  private fun startProofRecording(
    overlay: ProofOverlay,
    maxDurationSeconds: Double,
    encoding: ProofRecorder.Encoding,
  ) {
    val recorder = proofRecorder ?: ProofRecorder(context).also { proofRecorder = it }
    try {
      overlayFromNative = true
      recorder.start(overlay, maxDurationSeconds, encoding)
      startProofCaptureLoop(encoding.frameRate)
    } catch (error: Exception) {
      stopProofCaptureLoop()
      onProofRecordingError(mapOf("message" to START_FAILED))
    }
  }

  /** Counts successful pose frames and logs fps every few seconds for proof-on vs proof-off checks. */
  private fun notePoseSuccessFrame() {
    val nowMs = SystemClock.elapsedRealtime()
    if (poseFpsWindowStartMs == 0L) {
      poseFpsWindowStartMs = nowMs
    }
    poseSuccessFrames += 1
    val elapsedMs = nowMs - poseFpsWindowStartMs
    if (elapsedMs < POSE_FPS_LOG_INTERVAL_MS) return
    val fps = poseSuccessFrames * 1000.0 / elapsedMs
    val recording = proofRecorder?.isRecording == true
    Log.i(LOG_TAG, "pose fps=%.1f recording=%s".format(fps, recording))
    poseSuccessFrames = 0
    poseFpsWindowStartMs = nowMs
  }

  /** Samples the camera surface for proof clips without coupling to the pose callback rate. */
  private fun startProofCaptureLoop(frameRate: Int) {
    stopProofCaptureLoop()
    val intervalMs = max(PROOF_CAPTURE_MIN_INTERVAL_MS, 1_000L / frameRate.coerceAtLeast(1))
    val tick =
      object : Runnable {
        override fun run() {
          val recorder = proofRecorder
          if (recorder == null || !recorder.isRecording || !isCameraRunning) {
            stopProofCaptureLoop()
            return
          }
          if (lastPoseStatusSuccess) {
            activeCameraSurface()?.let { recorder.captureFrom(it) }
          }
          proofCaptureHandler.postDelayed(this, intervalMs)
        }
      }
    proofCaptureTick = tick
    proofCaptureHandler.post(tick)
  }

  private fun stopProofCaptureLoop() {
    proofCaptureTick?.let { proofCaptureHandler.removeCallbacks(it) }
    proofCaptureTick = null
    lastPoseStatusSuccess = false
  }

  private fun intValue(raw: Any?, fallback: Int): Int =
    when (raw) {
      is Number -> raw.toInt()
      else -> fallback
    }

  /** Ends the clip and emits `onProofRecorded` with file URIs and the hash. */
  private fun finishProofRecording() {
    val recorder = proofRecorder ?: return
    if (!recorder.isRecording) return
    stopProofCaptureLoop()
    val endAtMs = finishProofEndAtMs.takeIf { it > 0 }?.toLong()

    recorder.finish(endAtMs) { result ->
      post { publishFinishedClip(result) }
    }
  }

  private fun publishFinishedClip(result: Result<ProofRecorder.FinishResult>) {
    val finished = result.getOrNull()
    if (finished == null) {
      onProofRecordingError(mapOf("message" to FINISH_FAILED))
      return
    }

    val payload = mutableMapOf<String, Any>(
      "fileUri" to Uri.fromFile(finished.videoFile).toString(),
      "sha256" to finished.sha256Hex,
      "byteSize" to finished.byteSize.toDouble(),
      "durationSeconds" to finished.durationSeconds,
    )
    finished.posterFile?.let { payload["posterUri"] = Uri.fromFile(it).toString() }
    onProofRecorded(payload)
  }

  private fun cancelProofRecording() {
    stopProofCaptureLoop()
    proofRecorder?.cancel()
  }

  private fun applyFeatures() {
    val pose = quickPose
    if (pose == null) {
      tryStart()
      return
    }

    val mapped = QuickPoseFeatures.map(featureKeys, featureStyles)
    if (mapped.isEmpty()) return

    currentFeatures = mapped
    pose.update(mapped.map { it.second }.toTypedArray())
  }

  private fun restart() {
    stop()
    tryStart()
  }

  private fun stop() {
    stopProofCaptureLoop()
    emitHandler.removeCallbacksAndMessages(null)
    pendingEmit = null
    emitScheduled = false
    poseSuccessFrames = 0
    poseFpsWindowStartMs = 0L
    proofRecorder?.shutdown()
    proofRecorder = null
    sessionScope?.cancel()
    sessionScope = null
    isCameraRunning = false
    quickPose?.stop()
    quickPose = null
    cameraView?.let { camera ->
      camera.stop()
      removeView(camera)
    }
    cameraView = null
    currentFeatures = emptyList()
  }

  private companion object {
    const val LOG_TAG = "HealthyPose"
    const val LANDMARK_MIN_VISIBILITY = 0.2f
    const val START_FAILED = "Could not start proof recording."
    const val FINISH_FAILED = "Could not finish proof recording."
    const val DEFAULT_BIT_RATE = 1_500_000
    const val DEFAULT_FRAME_RATE = 24
    const val DEFAULT_WIDTH = 720
    const val DEFAULT_HEIGHT = 1280
    /** Cap proof capture at ~30 fps even when encoding asks for more. */
    const val PROOF_CAPTURE_MIN_INTERVAL_MS = 33L
    /** Coalesce JS onUpdate to ~30 Hz unless count changes. */
    const val EMIT_MIN_INTERVAL_MS = 33L
    const val POSE_FPS_LOG_INTERVAL_MS = 5_000L
  }
}

