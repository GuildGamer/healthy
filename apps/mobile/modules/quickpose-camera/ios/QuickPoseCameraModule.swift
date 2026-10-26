import ExpoModulesCore

public class QuickPoseCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("QuickPoseCamera")

    View(HealthyQuickPoseView.self) {
      Events("onUpdate", "onProofRecorded", "onProofRecordingError")

      Prop("sdkKey") { (view: HealthyQuickPoseView, sdkKey: String) in
        view.sdkKey = sdkKey
      }

      Prop("features") { (view: HealthyQuickPoseView, features: [String]) in
        view.featureKeys = features
      }

      Prop("featureStyles") { (view: HealthyQuickPoseView, styles: [String: Any]?) in
        view.featureStyles = styles ?? [:]
      }

      Prop("useFrontCamera") { (view: HealthyQuickPoseView, useFrontCamera: Bool) in
        view.useFrontCamera = useFrontCamera
      }

      Prop("proofRecording") { (view: HealthyQuickPoseView, config: [String: Any]?) in
        view.proofRecording = config
      }

      Prop("proofCount") { (view: HealthyQuickPoseView, count: Int?) in
        view.proofCount = count ?? 0
      }

      Prop("finishProofToken") { (view: HealthyQuickPoseView, token: Int?) in
        view.finishProofToken = token ?? 0
      }
    }
  }
}
