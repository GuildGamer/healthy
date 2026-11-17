package expo.modules.quickposecamera

import kotlin.math.abs
import kotlin.math.hypot

/**
 * Spec: apps/mobile/src/lib/pose/pose-subject-lock.ts
 *
 * Tracks one athlete across frames. Background motion that steals the SDK's
 * single skeleton looks like a teleport and is ignored for counting.
 */
internal class SubjectLock {
  data class State(
    val hasAnchor: Boolean = false,
    val anchorX: Double = 0.0,
    val anchorY: Double = 0.0,
    val lastY: Double = 0.0,
    val lastMotionAtMs: Long = 0L,
    /** Motion observed while the current half-rep is armed (exit may pause at top). */
    val motionSinceArm: Boolean = false,
  )

  data class Tick(
    val state: State,
    val isLocked: Boolean,
    val subjectMovedRecently: Boolean,
    /** Whether this frame may drive the threshold counter. */
    val mayFeedCounter: Boolean,
  )

  private var state = State()

  fun reset() {
    state = State()
  }

  fun tick(frame: PoseStanceFrame?, finishingRep: Boolean, nowMs: Long): Tick {
    val result = tick(state, frame, finishingRep, nowMs)
    state = result.state
    return result
  }

  companion object {
    const val MIN_SCORE = 0.2
    /** Soft-follow the athlete within this jump (CAMERA_MOTION_SHIFT). */
    const val SOFT_UPDATE_MAX = 0.085
    /** Larger jump → treat as a different person; stop feeding the counter. */
    const val JUMP_UNLOCK = 0.2
    /** Shoulder/hip Y change that counts as real subject motion. */
    const val MOTION_Y_EPSILON = 0.012
    /** How long recent motion stays "fresh" for arming a half-rep. */
    const val MOTION_RECENT_MS = 400L
    const val COACH_PROMPT = "Stay in frame."

    private fun usable(point: PoseStance.Point?, minScore: Double = MIN_SCORE): PoseStance.Point? =
      if (point != null && point.score >= minScore) point else null

    private fun average(a: PoseStance.Point?, b: PoseStance.Point?): PoseStance.Point? {
      val left = usable(a) ?: return usable(b)
      val right = usable(b) ?: return left
      return PoseStance.Point(
        (left.x + right.x) / 2,
        (left.y + right.y) / 2,
        minOf(left.score, right.score),
      )
    }

    /** Prefer shoulders; hips if the upper body is cropped. */
    private fun subjectAnchor(frame: PoseStanceFrame): PoseStance.Point? =
      average(frame["leftShoulder"], frame["rightShoulder"])
        ?: average(frame["leftHip"], frame["rightHip"])

    fun tick(
      state: State,
      frame: PoseStanceFrame?,
      finishingRep: Boolean,
      nowMs: Long,
    ): Tick {
      if (frame == null) {
        // No landmarks — fail open so stale binaries still count on measure alone.
        return Tick(
          state = state,
          isLocked = true,
          subjectMovedRecently = true,
          mayFeedCounter = true,
        )
      }

      val point = subjectAnchor(frame)
      if (point == null) {
        val next =
          if (finishingRep) state else state.copy(motionSinceArm = false)
        return Tick(
          state = next,
          isLocked = false,
          subjectMovedRecently = false,
          mayFeedCounter = false,
        )
      }

      if (!state.hasAnchor) {
        val next =
          State(
            hasAnchor = true,
            anchorX = point.x,
            anchorY = point.y,
            lastY = point.y,
            lastMotionAtMs = nowMs,
            motionSinceArm = false,
          )
        val subjectMovedRecently = true
        return Tick(
          state = next,
          isLocked = true,
          subjectMovedRecently = subjectMovedRecently,
          mayFeedCounter = if (finishingRep) true else subjectMovedRecently,
        )
      }

      val jump = hypot(state.anchorX - point.x, state.anchorY - point.y)
      if (jump > JUMP_UNLOCK) {
        return Tick(
          state = State(),
          isLocked = false,
          subjectMovedRecently = false,
          mayFeedCounter = false,
        )
      }

      var next = state
      if (jump <= SOFT_UPDATE_MAX) {
        next = next.copy(anchorX = point.x, anchorY = point.y)
      }

      if (!finishingRep) {
        next = next.copy(motionSinceArm = false)
      }

      val yDelta = abs(point.y - next.lastY)
      val moved = yDelta >= MOTION_Y_EPSILON
      if (moved) {
        next =
          next.copy(
            lastMotionAtMs = nowMs,
            motionSinceArm = if (finishingRep) true else next.motionSinceArm,
          )
      }
      next = next.copy(lastY = point.y)

      val subjectMovedRecently = nowMs - next.lastMotionAtMs <= MOTION_RECENT_MS
      val mayFeedCounter =
        if (finishingRep) subjectMovedRecently || next.motionSinceArm else subjectMovedRecently

      return Tick(
        state = next,
        isLocked = true,
        subjectMovedRecently = subjectMovedRecently,
        mayFeedCounter = mayFeedCounter,
      )
    }
  }
}
