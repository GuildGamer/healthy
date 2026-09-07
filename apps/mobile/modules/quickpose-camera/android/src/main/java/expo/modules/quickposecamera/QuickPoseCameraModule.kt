package expo.modules.quickposecamera

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuickPoseCameraModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuickPoseCamera")

    View(QuickPoseCameraView::class) {
      Events("onUpdate")
      Prop("sdkKey") { _: QuickPoseCameraView, _: String -> }
      Prop("features") { _: QuickPoseCameraView, _: List<String> -> }
      Prop("featureStyles") { _: QuickPoseCameraView, _: Map<String, Any>? -> }
      Prop("useFrontCamera") { _: QuickPoseCameraView, _: Boolean -> }
    }
  }
}
