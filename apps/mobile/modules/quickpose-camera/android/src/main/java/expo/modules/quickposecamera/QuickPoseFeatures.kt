package expo.modules.quickposecamera

import ai.quickpose.core.Feature
import ai.quickpose.core.FitnessFeature
import ai.quickpose.core.Landmarks
import ai.quickpose.core.RelativeEdgeInsets
import ai.quickpose.core.Side
import ai.quickpose.core.Style
import android.graphics.Color

/** JS feature keys → QuickPose features. Keys match the iOS module one for one. */
internal object QuickPoseFeatures {
  fun map(keys: List<String>, styles: Map<String, Any?>): List<Pair<String, Feature>> =
    keys.mapNotNull { key ->
      val extras = styles[key].asStringMap()
      feature(key, parseStyle(extras), extras)?.let { key to it }
    }

  private fun feature(key: String, style: Style, extras: Map<String, Any?>): Feature? =
    when (key) {
      "fitness.pushUps" -> Feature.Fitness(FitnessFeature.PushUps, style)
      "fitness.squats" -> Feature.Fitness(FitnessFeature.Squats, style)
      "fitness.plank" -> Feature.Fitness(FitnessFeature.Plank, style)
      "fitness.jumpingJacks" -> Feature.Fitness(FitnessFeature.JumpingJacks, style)
      "fitness.burpees" -> Feature.Fitness(FitnessFeature.Burpees, style)
      "fitness.sitUps" -> Feature.Fitness(FitnessFeature.SitUps, style)
      "fitness.mountainClimbers" -> Feature.Fitness(FitnessFeature.MountainClimbers, style)
      "fitness.lunges", "fitness.lunges.left" ->
        Feature.Fitness(FitnessFeature.Lunges(Side.LEFT), style)
      "fitness.lunges.right" -> Feature.Fitness(FitnessFeature.Lunges(Side.RIGHT), style)
      "overlay.wholeBody" -> Feature.Overlay(Landmarks.Group.WholeBody(), style)
      "inside.wholeBody" ->
        Feature.Inside(insets(extras["edgeInsets"].asStringMap()), Landmarks.Group.WholeBody(), style)
      else -> null
    }

  private fun insets(raw: Map<String, Any?>): RelativeEdgeInsets =
    RelativeEdgeInsets(
      top = raw.float("top") ?: DEFAULT_INSET,
      left = raw.float("left") ?: DEFAULT_INSET,
      bottom = raw.float("bottom") ?: DEFAULT_INSET,
      right = raw.float("right") ?: DEFAULT_INSET,
    )

  private fun parseStyle(raw: Map<String, Any?>): Style {
    val conditionalColors = (raw["conditionalColors"] as? List<*>)?.mapNotNull { item ->
      val entry = item.asStringMap()
      val color = parseColor(entry["color"] as? String) ?: return@mapNotNull null
      Style.ConditionalColor(min = entry.float("min"), max = entry.float("max"), color = color)
    }

    return Style(
      relativeLineWidth = raw.float("relativeLineWidth") ?: 1f,
      cornerRadius = raw.float("cornerRadius") ?: 0f,
      color = parseColor(raw["color"] as? String) ?: Color.valueOf(Color.WHITE),
      conditionalColors = conditionalColors,
    )
  }

  private fun parseColor(hex: String?): Color? {
    if (hex.isNullOrBlank()) {
      return null
    }
    return runCatching { Color.valueOf(Color.parseColor(hex.trim())) }.getOrNull()
  }

  private const val DEFAULT_INSET = 0.1f
}

private fun Any?.asStringMap(): Map<String, Any?> =
  (this as? Map<*, *>)?.entries?.associate { (key, value) -> key.toString() to value } ?: emptyMap()

private fun Map<String, Any?>.float(key: String): Float? = (this[key] as? Number)?.toFloat()
