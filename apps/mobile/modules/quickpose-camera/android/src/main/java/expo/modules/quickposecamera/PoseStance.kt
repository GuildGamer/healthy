package expo.modules.quickposecamera

import kotlin.math.abs
import kotlin.math.hypot

/** Compact joint map from the native landmark bridge. */
internal typealias PoseStanceFrame = Map<String, PoseStance.Point>

/**
 * Spec: apps/mobile/src/lib/pose/pose-stance.ts + pushup-form helpers used there.
 */
internal object PoseStance {
  const val MIN_SCORE = 0.2
  const val STANCE_COACH = "Get into position"
  private const val STANDING_TORSO_SPAN = 0.5
  private const val KNEELING_TORSO_MIN = 0.28
  private const val KNEE_NEAR_HIP_MAX = 0.14
  private const val UPRIGHT_TORSO_MIN = 0.22
  private const val SUPINE_TORSO_MAX = 0.32
  private const val LUNGE_KNEE_Y_GAP = 0.06
  private const val CLIMBER_KNEE_HIP_MAX = 0.16
  private const val MIN_BODY_EXTENT = 0.24
  private const val MAX_SHOULDER_WIDTH = 0.44

  data class Point(val x: Double, val y: Double, val score: Double)

  /**
   * Stance gate for live counting. Missing landmarks fail open so fitness
   * scores still count; kneeling-wave rejection needs landmarks.
   */
  fun resolve(metric: String, frame: PoseStanceFrame?, landmarksAvailable: Boolean): Boolean {
    if (!landmarksAvailable || frame == null) {
      return true
    }
    return poseOk(metric, frame)
  }

  private fun poseOk(metric: String, frame: PoseStanceFrame): Boolean {
    if (shoulderMid(frame) == null) {
      return false
    }
    return when (metric) {
      "pushups", "plank" ->
        !looksLikeStandingUp(frame) && !looksLikeKneelingUpright(frame)
      "sit_ups" ->
        !looksLikeStandingUp(frame) &&
          !looksLikeKneelingUpright(frame) &&
          looksLikeSupineSitUp(frame)
      "squats" -> {
        if (looksLikeKneelingUpright(frame) && !bothAnklesVisible(frame)) {
          false
        } else {
          looksLikeSquatStand(frame)
        }
      }
      "jumping_jacks" -> looksLikeJumpingJack(frame)
      "burpees" -> {
        if (looksLikeKneelingUpright(frame) && !looksLikePronePress(frame)) {
          false
        } else {
          looksLikePronePress(frame) || looksLikeSquatStand(frame)
        }
      }
      "mountain_climbers" ->
        !looksLikeStandingUp(frame) &&
          !looksLikeKneelingUpright(frame) &&
          looksLikeMountainClimber(frame)
      "lunges" -> looksLikeLunge(frame)
      else -> false
    }
  }

  private fun usable(point: Point?, minScore: Double = MIN_SCORE): Point? =
    if (point != null && point.score >= minScore) point else null

  private fun average(a: Point?, b: Point?): Point? {
    val left = usable(a) ?: return usable(b)
    val right = usable(b) ?: return left
    return Point((left.x + right.x) / 2, (left.y + right.y) / 2, minOf(left.score, right.score))
  }

  private fun shoulderMid(frame: PoseStanceFrame): Point? =
    average(frame["leftShoulder"], frame["rightShoulder"])

  private fun hipMid(frame: PoseStanceFrame): Point? = average(frame["leftHip"], frame["rightHip"])

  private fun looksLikeStandingUp(frame: PoseStanceFrame): Boolean {
    val shoulder = shoulderMid(frame) ?: return false
    val hip = hipMid(frame) ?: return false
    return hip.y - shoulder.y >= STANDING_TORSO_SPAN
  }

  private fun looksLikeKneelingUpright(frame: PoseStanceFrame): Boolean {
    val shoulder = shoulderMid(frame) ?: return false
    val hip = hipMid(frame) ?: return false
    if (hip.y - shoulder.y < KNEELING_TORSO_MIN) {
      return false
    }
    val leftKnee = usable(frame["leftKnee"]) ?: return false
    val rightKnee = usable(frame["rightKnee"]) ?: return false
    return abs(leftKnee.y - hip.y) <= KNEE_NEAR_HIP_MAX &&
      abs(rightKnee.y - hip.y) <= KNEE_NEAR_HIP_MAX
  }

  private fun bothAnklesVisible(frame: PoseStanceFrame): Boolean =
    usable(frame["leftAnkle"]) != null && usable(frame["rightAnkle"]) != null

  private fun bothWristsVisible(frame: PoseStanceFrame): Boolean =
    usable(frame["leftWrist"]) != null && usable(frame["rightWrist"]) != null

  private fun torsoSpan(frame: PoseStanceFrame): Double? {
    val shoulder = shoulderMid(frame) ?: return null
    val hip = hipMid(frame) ?: return null
    return hip.y - shoulder.y
  }

  private fun looksLikeUprightStand(frame: PoseStanceFrame): Boolean {
    val span = torsoSpan(frame) ?: return false
    if (span < UPRIGHT_TORSO_MIN) {
      return false
    }
    if (looksLikeKneelingUpright(frame) && !bothAnklesVisible(frame)) {
      return false
    }
    return true
  }

  private fun looksLikeSupineSitUp(frame: PoseStanceFrame): Boolean {
    val shoulder = shoulderMid(frame) ?: return false
    val hip = hipMid(frame) ?: return false
    if (looksLikeStandingUp(frame) || looksLikeKneelingUpright(frame)) {
      return false
    }
    val span = hip.y - shoulder.y
    return span <= SUPINE_TORSO_MAX || (shoulder.y > 0.35 && hip.y > shoulder.y)
  }

  private fun looksLikeSquatStand(frame: PoseStanceFrame): Boolean {
    if (!looksLikeUprightStand(frame)) {
      return false
    }
    val shoulder = shoulderMid(frame) ?: return false
    val hip = hipMid(frame) ?: return false
    return hip.y - shoulder.y >= UPRIGHT_TORSO_MIN
  }

  private fun looksLikeJumpingJack(frame: PoseStanceFrame): Boolean =
    looksLikeUprightStand(frame) && bothWristsVisible(frame) && bothAnklesVisible(frame)

  private fun looksLikeLunge(frame: PoseStanceFrame): Boolean {
    if (!looksLikeUprightStand(frame)) {
      return false
    }
    val leftKnee = usable(frame["leftKnee"]) ?: return false
    val rightKnee = usable(frame["rightKnee"]) ?: return false
    return abs(leftKnee.y - rightKnee.y) >= LUNGE_KNEE_Y_GAP
  }

  private fun hasPushupFraming(frame: PoseStanceFrame): Boolean {
    val leftShoulder = usable(frame["leftShoulder"]) ?: return false
    val rightShoulder = usable(frame["rightShoulder"]) ?: return false
    val hip = hipMid(frame)
    val hasArm =
      usable(frame["leftElbow"]) != null ||
        usable(frame["rightElbow"]) != null ||
        usable(frame["leftWrist"]) != null ||
        usable(frame["rightWrist"]) != null
    if (hip == null && !hasArm) {
      return false
    }
    val shoulderWidth =
      hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y)
    if (shoulderWidth > MAX_SHOULDER_WIDTH) {
      return false
    }
    return bodyExtent(frame) >= MIN_BODY_EXTENT
  }

  private fun bodyExtent(frame: PoseStanceFrame): Double {
    var minY = 1.0
    var maxY = 0.0
    var count = 0
    for (name in FRAMING_LANDMARKS) {
      val point = usable(frame[name]) ?: continue
      minY = minOf(minY, point.y)
      maxY = maxOf(maxY, point.y)
      count += 1
    }
    return if (count < 3) 0.0 else maxY - minY
  }

  private fun looksLikePronePress(frame: PoseStanceFrame): Boolean {
    if (!hasPushupFraming(frame)) {
      return false
    }
    if (looksLikeStandingUp(frame) || looksLikeKneelingUpright(frame)) {
      return false
    }
    return true
  }

  private fun looksLikeMountainClimber(frame: PoseStanceFrame): Boolean {
    if (!looksLikePronePress(frame)) {
      return false
    }
    val hip = hipMid(frame) ?: return false
    val leftKnee = frame["leftKnee"]
    val rightKnee = frame["rightKnee"]
    val leftClose = usable(leftKnee)?.let { abs(it.y - hip.y) <= CLIMBER_KNEE_HIP_MAX } == true
    val rightClose = usable(rightKnee)?.let { abs(it.y - hip.y) <= CLIMBER_KNEE_HIP_MAX } == true
    if (leftClose || rightClose) {
      return true
    }
    val left = usable(leftKnee) ?: return false
    val right = usable(rightKnee) ?: return false
    return left.y > hip.y && right.y > hip.y
  }

  private val FRAMING_LANDMARKS =
    listOf(
      "nose",
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
      "leftHip",
      "rightHip",
    )
}
