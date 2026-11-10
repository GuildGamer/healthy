import Foundation

/// Native pose counting — ports JS threshold/hold/stance/framing so every
/// QuickPose success frame updates the counter without the JS bridge.
final class PoseCountEngine {
  static let insideFeature = "inside.wholeBody"
  static let insideReps = 0.95
  static let insideHold = 0.88
  static let comeAllTheWayUp = "Come all the way up."

  private static let lungesFeatures = ["fitness.lunges.left", "fitness.lunges.right"]
  private static let featureByMetric: [String: String] = [
    "pushups": "fitness.pushUps",
    "squats": "fitness.squats",
    "plank": "fitness.plank",
    "jumping_jacks": "fitness.jumpingJacks",
    "burpees": "fitness.burpees",
    "sit_ups": "fitness.sitUps",
    "mountain_climbers": "fitness.mountainClimbers",
    "lunges": "fitness.lunges.left",
  ]

  struct Snapshot {
    let count: Int
    let phase: String
    let bodyInFrame: Bool
    let tooClose: Bool
    let coachPrompt: String?
    let measure: Double?
    let countChanged: Bool
  }

  var metric: String = "pushups" {
    didSet {
      if oldValue != metric {
        rebuildCounters()
      }
    }
  }

  private var counter = ThresholdCounter.forMetric("pushups")
  private var hold = HoldTimer()
  private var lastOkStance = false
  private var lastTickMs: Int64 = 0

  func reset() {
    rebuildCounters()
    lastOkStance = false
    lastTickMs = 0
  }

  func liveCount() -> Int {
    metric == "plank" ? hold.seconds : counter.count
  }

  func process(
    results: [String: Double],
    feedbacks: [String: String],
    frame: PoseStance.Frame?,
    landmarksAvailable: Bool,
    nowMs: Int64
  ) -> Snapshot {
    let holdMode = metric == "plank"
    let measure = exerciseMeasure(results)
    let insideMeasure = finite(results[Self.insideFeature])
    let formFeedback = exerciseFormFeedback(feedbacks)
    let framingFeedback = feedbacks[Self.insideFeature].flatMap { $0.isEmpty ? nil : $0 }
    let framing = Self.framing(insideMeasure: insideMeasure, holdMode: holdMode)
    let stanceOk = PoseStance.resolve(
      metric: metric,
      frame: frame,
      landmarksAvailable: landmarksAvailable
    )
    if stanceOk {
      lastOkStance = true
    }
    let stanceFeedback: String? =
      (landmarksAvailable && frame != nil && !stanceOk) ? PoseStance.stanceCoach : nil

    if holdMode {
      let deltaSeconds: Double =
        lastTickMs > 0 ? min(0.25, Double(nowMs - lastTickMs) / 1000.0) : 0
      lastTickMs = nowMs
      let countChanged = hold.tick(
        measure: measure,
        bodyInFrame: framing.bodyInFrame,
        formFeedback: formFeedback,
        stanceOk: stanceOk,
        deltaSeconds: deltaSeconds
      )
      let coach = formFeedback ?? framingFeedback ?? stanceFeedback
      return Snapshot(
        count: hold.seconds,
        phase: hold.isHolding ? "down" : "up",
        bodyInFrame: framing.bodyInFrame,
        tooClose: framing.tooClose,
        coachPrompt: coach,
        measure: measure,
        countChanged: countChanged
      )
    }

    let finishingRep = counter.isEntered
    let previousCount = counter.count
    if let measure,
      Self.shouldCountPoseRep(
        measure: measure,
        insideMeasure: insideMeasure,
        finishingRep: finishingRep,
        stanceOk: stanceOk,
        finishingStanceOk: lastOkStance
      )
    {
      counter.tick(value: measure, nowMs: nowMs)
    }

    let coach =
      formFeedback
      ?? framingFeedback
      ?? stanceFeedback
      ?? (counter.isEntered ? Self.comeAllTheWayUp : nil)

    return Snapshot(
      count: counter.count,
      phase: counter.isEntered ? "down" : "up",
      bodyInFrame: framing.bodyInFrame,
      tooClose: framing.tooClose,
      coachPrompt: coach,
      measure: measure,
      countChanged: counter.count != previousCount
    )
  }

  private func rebuildCounters() {
    counter = ThresholdCounter.forMetric(metric)
    hold = HoldTimer()
  }

  private func exerciseMeasure(_ results: [String: Double]) -> Double? {
    if metric == "lunges" {
      let sides = Self.lungesFeatures.compactMap { finite(results[$0]) }
      return sides.max()
    }
    guard let key = Self.featureByMetric[metric] else { return nil }
    return finite(results[key])
  }

  private func exerciseFormFeedback(_ feedbacks: [String: String]) -> String? {
    if metric == "lunges" {
      for key in Self.lungesFeatures {
        if let prompt = feedbacks[key], !prompt.isEmpty {
          return prompt
        }
      }
      return nil
    }
    guard let key = Self.featureByMetric[metric],
          let prompt = feedbacks[key],
          !prompt.isEmpty
    else { return nil }
    return prompt
  }

  private struct Framing {
    let tooClose: Bool
    let bodyInFrame: Bool
  }

  private static func framing(insideMeasure: Double?, holdMode: Bool) -> Framing {
    guard let insideMeasure else {
      return Framing(tooClose: false, bodyInFrame: false)
    }
    let threshold = holdMode ? insideHold : insideReps
    let wellFramed = insideMeasure >= threshold
    return Framing(tooClose: !wellFramed, bodyInFrame: wellFramed)
  }

  private static func shouldCountPoseRep(
    measure: Double,
    insideMeasure: Double?,
    finishingRep: Bool,
    stanceOk: Bool,
    finishingStanceOk: Bool
  ) -> Bool {
    if finishingRep {
      return finishingStanceOk
    }
    if !stanceOk {
      return false
    }
    return insideMeasure != nil && insideMeasure! > 0
  }

  private func finite(_ value: Double?) -> Double? {
    guard let value, value.isFinite else { return nil }
    return value
  }
}
