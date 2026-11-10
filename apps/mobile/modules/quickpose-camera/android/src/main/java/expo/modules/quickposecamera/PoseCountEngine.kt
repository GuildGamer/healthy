package expo.modules.quickposecamera

/**
 * Native pose counting — ports JS threshold/hold/stance/framing from
 * apps/mobile/src/lib/pose so every QuickPose success frame updates the
 * counter without the JS bridge.
 */
internal class PoseCountEngine {
  @Volatile
  var metric: String = "pushups"
    set(value) {
      if (field == value) return
      field = value
      rebuildCounters()
    }

  private var counter = ThresholdCounter.forMetric(metric)
  private var hold = HoldTimer()
  private var lastOkStance = false
  private var lastTickMs = 0L

  data class Snapshot(
    val count: Int,
    val phase: String,
    val bodyInFrame: Boolean,
    val tooClose: Boolean,
    val coachPrompt: String?,
    val measure: Double?,
    val countChanged: Boolean,
  )

  fun reset() {
    rebuildCounters()
    lastOkStance = false
    lastTickMs = 0L
  }

  fun process(
    results: Map<String, Double>,
    feedbacks: Map<String, String>,
    frame: PoseStanceFrame?,
    landmarksAvailable: Boolean,
    nowMs: Long,
  ): Snapshot {
    val holdMode = metric == "plank"
    val measure = exerciseMeasure(results)
    val insideMeasure = finite(results[INSIDE_FEATURE])
    val formFeedback = exerciseFormFeedback(feedbacks)
    val framingFeedback = feedbacks[INSIDE_FEATURE]?.takeIf { it.isNotEmpty() }
    val framing = framing(insideMeasure, holdMode)
    val stanceOk = PoseStance.resolve(metric, frame, landmarksAvailable)
    if (stanceOk) {
      lastOkStance = true
    }
    val stanceFeedback =
      if (landmarksAvailable && frame != null && !stanceOk) PoseStance.STANCE_COACH else null

    if (holdMode) {
      val deltaSeconds =
        if (lastTickMs > 0) minOf(0.25, (nowMs - lastTickMs) / 1000.0) else 0.0
      lastTickMs = nowMs
      val countChanged =
        hold.tick(
          measure = measure,
          bodyInFrame = framing.bodyInFrame,
          formFeedback = formFeedback,
          stanceOk = stanceOk,
          deltaSeconds = deltaSeconds,
        )
      val coach = formFeedback ?: framingFeedback ?: stanceFeedback
      return Snapshot(
        count = hold.seconds,
        phase = if (hold.isHolding) "down" else "up",
        bodyInFrame = framing.bodyInFrame,
        tooClose = framing.tooClose,
        coachPrompt = coach,
        measure = measure,
        countChanged = countChanged,
      )
    }

    val finishingRep = counter.isEntered
    val previousCount = counter.count
    if (
      measure != null &&
        shouldCountPoseRep(
          measure = measure,
          insideMeasure = insideMeasure,
          finishingRep = finishingRep,
          stanceOk = stanceOk,
          finishingStanceOk = lastOkStance,
        )
    ) {
      counter.tick(measure, nowMs)
    }

    val coach =
      formFeedback
        ?: framingFeedback
        ?: stanceFeedback
        ?: if (counter.isEntered) COME_ALL_THE_WAY_UP else null

    return Snapshot(
      count = counter.count,
      phase = if (counter.isEntered) "down" else "up",
      bodyInFrame = framing.bodyInFrame,
      tooClose = framing.tooClose,
      coachPrompt = coach,
      measure = measure,
      countChanged = counter.count != previousCount,
    )
  }

  /** Live count for proof burn-in (reps or whole hold seconds). */
  fun liveCount(): Int = if (metric == "plank") hold.seconds else counter.count

  private fun rebuildCounters() {
    counter = ThresholdCounter.forMetric(metric)
    hold = HoldTimer()
  }

  private fun exerciseMeasure(results: Map<String, Double>): Double? {
    if (metric == "lunges") {
      val sides =
        LUNGES_FEATURES.mapNotNull { key -> finite(results[key]) }
      return if (sides.isEmpty()) null else sides.maxOrNull()
    }
    val key = FEATURE_BY_METRIC[metric] ?: return null
    return finite(results[key])
  }

  private fun exerciseFormFeedback(feedbacks: Map<String, String>): String? {
    if (metric == "lunges") {
      for (key in LUNGES_FEATURES) {
        val prompt = feedbacks[key]
        if (!prompt.isNullOrEmpty()) {
          return prompt
        }
      }
      return null
    }
    val key = FEATURE_BY_METRIC[metric] ?: return null
    return feedbacks[key]?.takeIf { it.isNotEmpty() }
  }

  private data class Framing(val tooClose: Boolean, val bodyInFrame: Boolean)

  private fun framing(insideMeasure: Double?, holdMode: Boolean): Framing {
    if (insideMeasure == null) {
      return Framing(tooClose = false, bodyInFrame = false)
    }
    val threshold = if (holdMode) INSIDE_HOLD else INSIDE_REPS
    val wellFramed = insideMeasure >= threshold
    return Framing(tooClose = !wellFramed, bodyInFrame = wellFramed)
  }

  private fun shouldCountPoseRep(
    measure: Double,
    insideMeasure: Double?,
    finishingRep: Boolean,
    stanceOk: Boolean,
    finishingStanceOk: Boolean,
  ): Boolean {
    if (finishingRep) {
      return finishingStanceOk
    }
    if (!stanceOk) {
      return false
    }
    return insideMeasure != null && insideMeasure > 0
  }

  private fun finite(value: Double?): Double? =
    if (value != null && value.isFinite()) value else null

  companion object {
    const val INSIDE_FEATURE = "inside.wholeBody"
    const val INSIDE_REPS = 0.95
    const val INSIDE_HOLD = 0.88
    const val COME_ALL_THE_WAY_UP = "Come all the way up."

    private val LUNGES_FEATURES = listOf("fitness.lunges.left", "fitness.lunges.right")

    private val FEATURE_BY_METRIC =
      mapOf(
        "pushups" to "fitness.pushUps",
        "squats" to "fitness.squats",
        "plank" to "fitness.plank",
        "jumping_jacks" to "fitness.jumpingJacks",
        "burpees" to "fitness.burpees",
        "sit_ups" to "fitness.sitUps",
        "mountain_climbers" to "fitness.mountainClimbers",
        "lunges" to "fitness.lunges.left",
      )
  }
}
