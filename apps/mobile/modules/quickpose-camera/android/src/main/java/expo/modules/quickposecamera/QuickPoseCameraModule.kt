package expo.modules.quickposecamera

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuickPoseCameraModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuickPoseCamera")

    Constants {
      val context = appContext.reactContext
      val directoryUri = context?.let { Uri.fromFile(ProofRecorder.durableDirectory(it)).toString() } ?: ""
      mapOf("proofClipsDirectoryUri" to directoryUri)
    }

    View(QuickPoseCameraView::class) {
      Events("onUpdate", "onProofRecorded", "onProofRecordingError")

      Prop("sdkKey") { view: QuickPoseCameraView, sdkKey: String ->
        view.sdkKey = sdkKey
      }

      Prop("features") { view: QuickPoseCameraView, features: List<String> ->
        view.featureKeys = features
      }

      Prop("featureStyles") { view: QuickPoseCameraView, styles: Map<String, Any?>? ->
        view.featureStyles = styles ?: emptyMap()
      }

      Prop("useFrontCamera") { view: QuickPoseCameraView, useFrontCamera: Boolean ->
        view.useFrontCamera = useFrontCamera
      }

      Prop("proofRecording") { view: QuickPoseCameraView, config: Map<String, Any?>? ->
        view.proofRecording = config
      }

      Prop("proofCount") { view: QuickPoseCameraView, count: Int? ->
        view.proofCount = count ?: 0
      }

      Prop("finishProofEndAtMs") { view: QuickPoseCameraView, endAtMs: Double? ->
        view.finishProofEndAtMs = endAtMs ?: 0.0
      }

      Prop("finishProofToken") { view: QuickPoseCameraView, token: Int? ->
        view.finishProofToken = token ?: 0
      }
    }
  }
}
