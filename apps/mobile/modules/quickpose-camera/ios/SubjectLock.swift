import Foundation

/// Spec: apps/mobile/src/lib/pose/pose-subject-lock.ts
/// Tracks one athlete across frames. Background motion that steals the SDK's
/// single skeleton looks like a teleport and is ignored for counting.
struct SubjectLock {
  static let minScore = 0.2
  /// Soft-follow the athlete within this jump (CAMERA_MOTION_SHIFT).
  static let softUpdateMax = 0.085
  /// Larger jump → treat as a different person; stop feeding the counter.
  static let jumpUnlock = 0.2
  /// Shoulder/hip Y change that counts as real subject motion.
  static let motionYEpsilon = 0.012
  /// How long recent motion stays "fresh" for arming a half-rep.
  static let motionRecentMs: Int64 = 400
  static let coachPrompt = "Stay in frame."

  struct State {
    var hasAnchor = false
    var anchorX = 0.0
    var anchorY = 0.0
    var lastY = 0.0
    var lastMotionAtMs: Int64 = 0
    /// Motion observed while the current half-rep is armed (exit may pause at top).
    var motionSinceArm = false

    static func empty() -> State {
      State()
    }
  }

  struct Tick {
    var state: State
    let isLocked: Bool
    let subjectMovedRecently: Bool
    /// Whether this frame may drive the threshold counter.
    let mayFeedCounter: Bool
  }

  private var state = State.empty()

  mutating func reset() {
    state = State.empty()
  }

  mutating func tick(frame: PoseStance.Frame?, finishingRep: Bool, nowMs: Int64) -> Tick {
    let result = Self.tick(state: state, frame: frame, finishingRep: finishingRep, nowMs: nowMs)
    state = result.state
    return result
  }

  private static func tick(
    state: State,
    frame: PoseStance.Frame?,
    finishingRep: Bool,
    nowMs: Int64
  ) -> Tick {
    guard let frame else {
      // No landmarks — fail open so stale binaries still count on measure alone.
      return Tick(
        state: state,
        isLocked: true,
        subjectMovedRecently: true,
        mayFeedCounter: true
      )
    }

    guard let point = subjectAnchor(frame) else {
      var next = state
      if !finishingRep {
        next.motionSinceArm = false
      }
      return Tick(
        state: next,
        isLocked: false,
        subjectMovedRecently: false,
        mayFeedCounter: false
      )
    }

    var next = state

    if !next.hasAnchor {
      next = State(
        hasAnchor: true,
        anchorX: point.x,
        anchorY: point.y,
        lastY: point.y,
        lastMotionAtMs: nowMs,
        motionSinceArm: false
      )
      let subjectMovedRecently = true
      return Tick(
        state: next,
        isLocked: true,
        subjectMovedRecently: subjectMovedRecently,
        mayFeedCounter: finishingRep ? true : subjectMovedRecently
      )
    }

    let jump = hypot(next.anchorX - point.x, next.anchorY - point.y)
    if jump > jumpUnlock {
      return Tick(
        state: State.empty(),
        isLocked: false,
        subjectMovedRecently: false,
        mayFeedCounter: false
      )
    }

    if jump <= softUpdateMax {
      next.anchorX = point.x
      next.anchorY = point.y
    }

    if !finishingRep {
      next.motionSinceArm = false
    }

    let yDelta = abs(point.y - next.lastY)
    let moved = yDelta >= motionYEpsilon
    if moved {
      next.lastMotionAtMs = nowMs
      if finishingRep {
        next.motionSinceArm = true
      }
    }
    next.lastY = point.y

    let subjectMovedRecently = nowMs - next.lastMotionAtMs <= motionRecentMs
    let mayFeedCounter =
      finishingRep ? (subjectMovedRecently || next.motionSinceArm) : subjectMovedRecently

    return Tick(
      state: next,
      isLocked: true,
      subjectMovedRecently: subjectMovedRecently,
      mayFeedCounter: mayFeedCounter
    )
  }

  private static func usable(_ point: PoseStance.Point?, scoreFloor: Double = minScore)
    -> PoseStance.Point?
  {
    guard let point, point.score >= scoreFloor else { return nil }
    return point
  }

  private static func average(_ a: PoseStance.Point?, _ b: PoseStance.Point?) -> PoseStance.Point? {
    guard let left = usable(a) else { return usable(b) }
    guard let right = usable(b) else { return left }
    return PoseStance.Point(
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      score: min(left.score, right.score)
    )
  }

  /// Prefer shoulders; hips if the upper body is cropped.
  private static func subjectAnchor(_ frame: PoseStance.Frame) -> PoseStance.Point? {
    average(frame["leftShoulder"], frame["rightShoulder"])
      ?? average(frame["leftHip"], frame["rightHip"])
  }
}
