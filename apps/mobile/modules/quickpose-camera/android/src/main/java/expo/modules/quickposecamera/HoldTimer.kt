package expo.modules.quickposecamera

/**
 * Spec: apps/mobile/src/lib/pose/quickpose-hold-timer.ts
 * Accumulates whole seconds while the person is in the hold position.
 */
internal class HoldTimer {
  var seconds: Int = 0
    private set
  var isHolding: Boolean = false
    private set
  private var fraction: Double = 0.0

  fun tick(
    measure: Double?,
    bodyInFrame: Boolean,
    formFeedback: String?,
    stanceOk: Boolean,
    deltaSeconds: Double,
  ): Boolean {
    val previousSeconds = seconds
    if (
      measure == null ||
      !bodyInFrame ||
      !formFeedback.isNullOrEmpty() ||
      !stanceOk ||
      deltaSeconds <= 0
    ) {
      isHolding = false
      fraction = 0.0
      return false
    }

    val enters = measure >= HOLD_ENTER
    val stays = measure >= HOLD_EXIT
    isHolding = if (isHolding) stays else enters

    if (!isHolding) {
      fraction = 0.0
      return false
    }

    val nextFraction = fraction + deltaSeconds
    val whole = nextFraction.toInt()
    seconds += whole
    fraction = nextFraction - whole
    return seconds != previousSeconds
  }

  fun reset() {
    seconds = 0
    isHolding = false
    fraction = 0.0
  }

  companion object {
    const val HOLD_ENTER = 0.55
    const val HOLD_EXIT = 0.35
  }
}
