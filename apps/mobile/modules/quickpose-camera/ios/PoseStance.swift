import Foundation

/// Spec: apps/mobile/src/lib/pose/pose-stance.ts + pushup-form helpers used there.
enum PoseStance {
  static let minScore = 0.2
  static let stanceCoach = "Get into position"
  private static let standingTorsoSpan = 0.5
  private static let kneelingTorsoMin = 0.28
  private static let kneeNearHipMax = 0.14
  private static let uprightTorsoMin = 0.22
  private static let supineTorsoMax = 0.32
  private static let lungeKneeYGap = 0.06
  private static let climberKneeHipMax = 0.16
  private static let minBodyExtent = 0.24
  private static let maxShoulderWidth = 0.44

  struct Point {
    let x: Double
    let y: Double
    let score: Double
  }

  typealias Frame = [String: Point]

  /// Missing landmarks fail open so fitness scores still count.
  static func resolve(metric: String, frame: Frame?, landmarksAvailable: Bool) -> Bool {
    if !landmarksAvailable || frame == nil {
      return true
    }
    return poseOk(metric: metric, frame: frame!)
  }

  private static func poseOk(metric: String, frame: Frame) -> Bool {
    guard shoulderMid(frame) != nil else { return false }
    switch metric {
    case "pushups", "plank":
      return !looksLikeStandingUp(frame) && !looksLikeKneelingUpright(frame)
    case "sit_ups":
      return !looksLikeStandingUp(frame)
        && !looksLikeKneelingUpright(frame)
        && looksLikeSupineSitUp(frame)
    case "squats":
      if looksLikeKneelingUpright(frame) && !bothAnklesVisible(frame) {
        return false
      }
      return looksLikeSquatStand(frame)
    case "jumping_jacks":
      return looksLikeJumpingJack(frame)
    case "burpees":
      if looksLikeKneelingUpright(frame) && !looksLikePronePress(frame) {
        return false
      }
      return looksLikePronePress(frame) || looksLikeSquatStand(frame)
    case "mountain_climbers":
      return !looksLikeStandingUp(frame)
        && !looksLikeKneelingUpright(frame)
        && looksLikeMountainClimber(frame)
    case "lunges":
      return looksLikeLunge(frame)
    default:
      return false
    }
  }

  private static func usable(_ point: Point?, scoreFloor: Double = minScore) -> Point? {
    guard let point, point.score >= scoreFloor else { return nil }
    return point
  }

  private static func average(_ a: Point?, _ b: Point?) -> Point? {
    guard let left = usable(a) else { return usable(b) }
    guard let right = usable(b) else { return left }
    return Point(
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      score: min(left.score, right.score)
    )
  }

  private static func shoulderMid(_ frame: Frame) -> Point? {
    average(frame["leftShoulder"], frame["rightShoulder"])
  }

  private static func hipMid(_ frame: Frame) -> Point? {
    average(frame["leftHip"], frame["rightHip"])
  }

  private static func looksLikeStandingUp(_ frame: Frame) -> Bool {
    guard let shoulder = shoulderMid(frame), let hip = hipMid(frame) else { return false }
    return hip.y - shoulder.y >= standingTorsoSpan
  }

  private static func looksLikeKneelingUpright(_ frame: Frame) -> Bool {
    guard let shoulder = shoulderMid(frame), let hip = hipMid(frame) else { return false }
    if hip.y - shoulder.y < kneelingTorsoMin { return false }
    guard let leftKnee = usable(frame["leftKnee"]),
          let rightKnee = usable(frame["rightKnee"])
    else { return false }
    return abs(leftKnee.y - hip.y) <= kneeNearHipMax
      && abs(rightKnee.y - hip.y) <= kneeNearHipMax
  }

  private static func bothAnklesVisible(_ frame: Frame) -> Bool {
    usable(frame["leftAnkle"]) != nil && usable(frame["rightAnkle"]) != nil
  }

  private static func bothWristsVisible(_ frame: Frame) -> Bool {
    usable(frame["leftWrist"]) != nil && usable(frame["rightWrist"]) != nil
  }

  private static func torsoSpan(_ frame: Frame) -> Double? {
    guard let shoulder = shoulderMid(frame), let hip = hipMid(frame) else { return nil }
    return hip.y - shoulder.y
  }

  private static func looksLikeUprightStand(_ frame: Frame) -> Bool {
    guard let span = torsoSpan(frame), span >= uprightTorsoMin else { return false }
    if looksLikeKneelingUpright(frame) && !bothAnklesVisible(frame) {
      return false
    }
    return true
  }

  private static func looksLikeSupineSitUp(_ frame: Frame) -> Bool {
    guard let shoulder = shoulderMid(frame), let hip = hipMid(frame) else { return false }
    if looksLikeStandingUp(frame) || looksLikeKneelingUpright(frame) { return false }
    let span = hip.y - shoulder.y
    return span <= supineTorsoMax || (shoulder.y > 0.35 && hip.y > shoulder.y)
  }

  private static func looksLikeSquatStand(_ frame: Frame) -> Bool {
    guard looksLikeUprightStand(frame),
          let shoulder = shoulderMid(frame),
          let hip = hipMid(frame)
    else { return false }
    return hip.y - shoulder.y >= uprightTorsoMin
  }

  private static func looksLikeJumpingJack(_ frame: Frame) -> Bool {
    looksLikeUprightStand(frame) && bothWristsVisible(frame) && bothAnklesVisible(frame)
  }

  private static func looksLikeLunge(_ frame: Frame) -> Bool {
    guard looksLikeUprightStand(frame),
          let leftKnee = usable(frame["leftKnee"]),
          let rightKnee = usable(frame["rightKnee"])
    else { return false }
    return abs(leftKnee.y - rightKnee.y) >= lungeKneeYGap
  }

  private static func hasPushupFraming(_ frame: Frame) -> Bool {
    guard let leftShoulder = usable(frame["leftShoulder"]),
          let rightShoulder = usable(frame["rightShoulder"])
    else { return false }
    let hip = hipMid(frame)
    let hasArm =
      usable(frame["leftElbow"]) != nil
      || usable(frame["rightElbow"]) != nil
      || usable(frame["leftWrist"]) != nil
      || usable(frame["rightWrist"]) != nil
    if hip == nil && !hasArm { return false }
    let shoulderWidth = hypot(
      rightShoulder.x - leftShoulder.x,
      rightShoulder.y - leftShoulder.y
    )
    if shoulderWidth > maxShoulderWidth { return false }
    return bodyExtent(frame) >= minBodyExtent
  }

  private static func bodyExtent(_ frame: Frame) -> Double {
    var minY = 1.0
    var maxY = 0.0
    var count = 0
    for name in framingLandmarks {
      guard let point = usable(frame[name]) else { continue }
      minY = min(minY, point.y)
      maxY = max(maxY, point.y)
      count += 1
    }
    return count < 3 ? 0 : maxY - minY
  }

  private static func looksLikePronePress(_ frame: Frame) -> Bool {
    guard hasPushupFraming(frame) else { return false }
    if looksLikeStandingUp(frame) || looksLikeKneelingUpright(frame) { return false }
    return true
  }

  private static func looksLikeMountainClimber(_ frame: Frame) -> Bool {
    guard looksLikePronePress(frame), let hip = hipMid(frame) else { return false }
    let leftKnee = frame["leftKnee"]
    let rightKnee = frame["rightKnee"]
    let leftClose =
      usable(leftKnee).map { abs($0.y - hip.y) <= climberKneeHipMax } ?? false
    let rightClose =
      usable(rightKnee).map { abs($0.y - hip.y) <= climberKneeHipMax } ?? false
    if leftClose || rightClose { return true }
    guard let left = usable(leftKnee), let right = usable(rightKnee) else { return false }
    return left.y > hip.y && right.y > hip.y
  }

  private static let framingLandmarks = [
    "nose",
    "leftShoulder",
    "rightShoulder",
    "leftElbow",
    "rightElbow",
    "leftWrist",
    "rightWrist",
    "leftHip",
    "rightHip",
  ]
}
