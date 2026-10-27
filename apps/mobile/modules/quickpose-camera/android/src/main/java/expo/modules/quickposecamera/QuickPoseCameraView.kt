package expo.modules.quickposecamera

import ai.quickpose.camera.QuickPoseCameraSwitchView
import ai.quickpose.core.Feature
import ai.quickpose.core.FeatureResult
import ai.quickpose.core.PoseFeedback
import ai.quickpose.core.QuickPose
import ai.quickpose.core.Status
import android.Manifest
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
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

  /** Live rep count pushed from JS while a proof clip is recording. */
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
      pose.start(mapped.map { it.second }.toTypedArray(), onFrame = { status, _, results, feedback, _ ->
        post { publishFrame(status, results, feedback) }
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
  ) {
    if (quickPose == null) return

    val recorder = proofRecorder
    if (recorder != null && recorder.isRecording) {
      activeCameraSurface()?.let { recorder.captureFrom(it) }
    }

    if (status !is Status.Success) return

    val results = mutableMapOf<String, Double>()
    val feedbacks = mutableMapOf<String, String>()
    for ((key, feature) in currentFeatures) {
      featureResults[feature]?.let { results[key] = it.value.toDouble() }
      feedback[feature]?.displayString?.takeIf { it.isNotEmpty() }?.let { feedbacks[key] = it }
    }
    onUpdate(mapOf("results" to results, "feedbacks" to feedbacks))
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
    if (existing != null && existing.isRecording) {
      existing.updateOverlay(code = code, label = label, count = proofCount)
      return
    }

    startProofRecording(ProofOverlay(code, label, proofCount), maxDurationSeconds)
  }

  private fun startProofRecording(overlay: ProofOverlay, maxDurationSeconds: Double) {
    val recorder = proofRecorder ?: ProofRecorder(context).also { proofRecorder = it }
    try {
      recorder.start(overlay, maxDurationSeconds)
    } catch (error: Exception) {
      onProofRecordingError(mapOf("message" to START_FAILED))
    }
  }

  /** Ends the clip and emits `onProofRecorded` with file URIs and the hash. */
  private fun finishProofRecording() {
    val recorder = proofRecorder ?: return
    if (!recorder.isRecording) return
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
    const val START_FAILED = "Could not start proof recording."
    const val FINISH_FAILED = "Could not finish proof recording."
  }
}
