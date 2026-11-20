import Foundation

/// Spec: apps/mobile/src/lib/pose/quickpose-hold-timer.ts
final class HoldTimer {
  static let holdEnter = 0.55
  static let holdExit = 0.35

  private(set) var seconds = 0
  private(set) var isHolding = false
  private var fraction = 0.0

  @discardableResult
  func tick(
    measure: Double?,
    bodyInFrame: Bool,
    formFeedback: String?,
    stanceOk: Bool,
    deltaSeconds: Double
  ) -> Bool {
    let previousSeconds = seconds
    let hasFormFeedback = formFeedback.map { !$0.isEmpty } ?? false
    if measure == nil || !bodyInFrame || hasFormFeedback || !stanceOk || deltaSeconds <= 0 {
      isHolding = false
      fraction = 0
      return false
    }

    let value = measure!
    let enters = value >= Self.holdEnter
    let stays = value >= Self.holdExit
    isHolding = isHolding ? stays : enters

    if !isHolding {
      fraction = 0
      return false
    }

    let nextFraction = fraction + deltaSeconds
    let whole = Int(nextFraction)
    seconds += whole
    fraction = nextFraction - Double(whole)
    return seconds != previousSeconds
  }

  func reset() {
    seconds = 0
    isHolding = false
    fraction = 0
  }
}
