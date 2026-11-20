package expo.modules.quickposecamera

/**
 * Spec: apps/mobile/src/lib/pose/quickpose-threshold-counter.ts
 * A rep completes when the feature value crosses enter (bottom) then exit (top).
 */
internal class ThresholdCounter(
  private val enterThreshold: Double,
  private val exitThreshold: Double,
  private val minIntervalMs: Long = MIN_REP_INTERVAL_MS,
) {
  var count: Int = 0
    private set
  var isEntered: Boolean = false
    private set
  private var lastCompleteAtMs: Long = 0

  fun tick(value: Double, nowMs: Long): Boolean {
    var countChanged = false
    if (!isEntered && value > enterThreshold) {
      isEntered = true
    } else if (isEntered && value < exitThreshold) {
      if (nowMs - lastCompleteAtMs >= minIntervalMs) {
        lastCompleteAtMs = nowMs
        isEntered = false
        count += 1
        countChanged = true
      }
    }
    return countChanged
  }

  fun reset() {
    count = 0
    isEntered = false
    lastCompleteAtMs = 0
  }

  companion object {
    const val DEFAULT_ENTER = 0.8
    const val DEFAULT_EXIT = 0.3
    const val PUSHUP_ENTER = 0.7
    const val PUSHUP_EXIT = 0.35
    const val MIN_REP_INTERVAL_MS = 280L

    fun forMetric(metric: String): ThresholdCounter =
      if (metric == "pushups") {
        ThresholdCounter(PUSHUP_ENTER, PUSHUP_EXIT)
      } else {
        ThresholdCounter(DEFAULT_ENTER, DEFAULT_EXIT)
      }
  }
}
