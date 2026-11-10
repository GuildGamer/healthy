import Foundation

/// Spec: apps/mobile/src/lib/pose/quickpose-threshold-counter.ts
final class ThresholdCounter {
  static let defaultEnter = 0.8
  static let defaultExit = 0.3
  static let pushupEnter = 0.7
  static let pushupExit = 0.35
  static let minRepIntervalMs: Int64 = 280

  let enterThreshold: Double
  let exitThreshold: Double
  let minIntervalMs: Int64
  private(set) var count = 0
  private(set) var isEntered = false
  private var lastCompleteAtMs: Int64 = 0

  init(enterThreshold: Double, exitThreshold: Double, minIntervalMs: Int64 = minRepIntervalMs) {
    self.enterThreshold = enterThreshold
    self.exitThreshold = exitThreshold
    self.minIntervalMs = minIntervalMs
  }

  static func forMetric(_ metric: String) -> ThresholdCounter {
    if metric == "pushups" {
      return ThresholdCounter(enterThreshold: pushupEnter, exitThreshold: pushupExit)
    }
    return ThresholdCounter(enterThreshold: defaultEnter, exitThreshold: defaultExit)
  }

  @discardableResult
  func tick(value: Double, nowMs: Int64) -> Bool {
    var countChanged = false
    if !isEntered && value > enterThreshold {
      isEntered = true
    } else if isEntered && value < exitThreshold {
      if nowMs - lastCompleteAtMs >= minIntervalMs {
        lastCompleteAtMs = nowMs
        isEntered = false
        count += 1
        countChanged = true
      }
    }
    return countChanged
  }

  func reset() {
    count = 0
    isEntered = false
    lastCompleteAtMs = 0
  }
}
