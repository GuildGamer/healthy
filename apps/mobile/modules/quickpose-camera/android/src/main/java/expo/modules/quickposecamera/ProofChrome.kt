package expo.modules.quickposecamera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import java.text.DateFormat
import java.util.Date
import kotlin.math.max

internal data class ProofOverlay(val code: String, val label: String, val count: Int)

/**
 * Burns the mark, verification code, live count and date into each frame
 * so the exported clip is self-evidencing. Layout matches the iOS recorder.
 * Metrics are tuned at 720×1280 and baseline-scaled to frame height so server
 * encoding size does not shrink chips relative to the picture.
 * Used only from the recorder thread.
 *
 * The camera image is already in `frame`; this only draws the chips on top.
 */
internal object ProofChrome {
  /** Overlay layout was tuned at 720×1280. */
  private const val CHROME_BASELINE_HEIGHT = 1280f

  private const val EDGE_INSET = 28f
  private const val TOP_INSET = 40f
  private const val BOTTOM_INSET = 56f
  private const val PADDING_HORIZONTAL = 16f
  private const val PADDING_VERTICAL = 10f
  private const val CHIP_CORNER_RADIUS = 14f
  private const val LINE_GAP = 3f
  private const val PIP_SIZE = 12f
  private const val PIP_GAP = 10f
  private const val SECONDARY_ALPHA = 217
  /** Mark only (no word). SVG mark is 161×167 inside a 219×250 lockup. */
  private const val BRAND_LOCKUP_HEIGHT = 40f
  private const val BRAND_LOCKUP_ASPECT = 161f / 167f
  /** Fractional crop of beatset_wordmark_white matching the SVG mark region. */
  private const val MARK_SOURCE_LEFT = 29f / 219f
  private const val MARK_SOURCE_TOP = 0f
  private const val MARK_SOURCE_WIDTH = 161f / 219f
  private const val MARK_SOURCE_HEIGHT = 167f / 250f
  private const val VERIFY_PATH = "beatset.tech/v/"

  private val chipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(140, 0, 0, 0) }
  private val pipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(255, 59, 48) }
  private val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val dateFormat = DateFormat.getDateInstance(DateFormat.MEDIUM)
  private val monospaceBold = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)

  private var cachedScale = Float.NaN
  private lateinit var codePaint: Paint
  private lateinit var urlPaint: Paint
  private lateinit var countPaint: Paint
  private lateinit var datePaint: Paint
  private var markBitmap: Bitmap? = null

  /** Draws proof chrome over the camera image already present in `frame`. */
  fun drawChrome(context: Context, frame: Bitmap, overlay: ProofOverlay) {
    val canvas = Canvas(frame)
    val width = frame.width.toFloat()
    val height = frame.height.toFloat()
    val scale = height / CHROME_BASELINE_HEIGHT
    ensurePaints(scale)
    drawBrandChip(context, canvas, scale)
    drawCodeChip(canvas, overlay.code, width, scale)
    drawCountChip(canvas, overlay, width, height, scale)
  }

  private fun ensurePaints(scale: Float) {
    if (cachedScale == scale && ::codePaint.isInitialized) return
    cachedScale = scale
    codePaint = scaledPaint(20f, monospaceBold, scale = scale)
    urlPaint = scaledPaint(14f, Typeface.DEFAULT, SECONDARY_ALPHA, scale)
    countPaint = scaledPaint(28f, Typeface.DEFAULT_BOLD, scale = scale)
    datePaint = scaledPaint(16f, Typeface.DEFAULT, SECONDARY_ALPHA, scale)
  }

  /** Top-left: recording pip and white mark (no word). */
  private fun drawBrandChip(context: Context, canvas: Canvas, scale: Float) {
    val edgeInset = EDGE_INSET * scale
    val topInset = TOP_INSET * scale
    val paddingH = PADDING_HORIZONTAL * scale
    val paddingV = PADDING_VERTICAL * scale
    val pipSize = PIP_SIZE * scale
    val pipGap = PIP_GAP * scale
    val cornerRadius = CHIP_CORNER_RADIUS * scale
    val lockupHeight = BRAND_LOCKUP_HEIGHT * scale
    val lockupWidth = lockupHeight * BRAND_LOCKUP_ASPECT

    val chip = RectF(
      edgeInset,
      topInset,
      edgeInset + paddingH + pipSize + pipGap + lockupWidth + paddingH,
      topInset + paddingV + lockupHeight + paddingV,
    )
    fillChip(canvas, chip, cornerRadius)

    val pipLeft = chip.left + paddingH
    val pipTop = chip.centerY() - pipSize / 2
    canvas.drawOval(RectF(pipLeft, pipTop, pipLeft + pipSize, pipTop + pipSize), pipPaint)

    val mark = brandMark(context) ?: return
    val lockupLeft = pipLeft + pipSize + pipGap
    val lockupTop = chip.centerY() - lockupHeight / 2
    val dest = RectF(lockupLeft, lockupTop, lockupLeft + lockupWidth, lockupTop + lockupHeight)
    canvas.drawBitmap(mark, null, dest, bitmapPaint)
  }

  /** Crops the full lockup asset to the mark region (word left out). */
  private fun brandMark(context: Context): Bitmap? {
    markBitmap?.let { return it }
    val full = BitmapFactory.decodeResource(context.resources, R.drawable.beatset_wordmark_white) ?: return null
    val left = (MARK_SOURCE_LEFT * full.width).toInt().coerceIn(0, full.width - 1)
    val top = (MARK_SOURCE_TOP * full.height).toInt().coerceIn(0, full.height - 1)
    val width = (MARK_SOURCE_WIDTH * full.width).toInt().coerceAtLeast(1).coerceAtMost(full.width - left)
    val height = (MARK_SOURCE_HEIGHT * full.height).toInt().coerceAtLeast(1).coerceAtMost(full.height - top)
    val cropped = Bitmap.createBitmap(full, left, top, width, height)
    if (cropped !== full) {
      full.recycle()
    }
    markBitmap = cropped
    return cropped
  }

  /** Top-right: code and verify URL so anyone watching knows where to check it. */
  private fun drawCodeChip(canvas: Canvas, code: String, width: Float, scale: Float) {
    val edgeInset = EDGE_INSET * scale
    val topInset = TOP_INSET * scale
    val paddingH = PADDING_HORIZONTAL * scale
    val paddingV = PADDING_VERTICAL * scale
    val lineGap = LINE_GAP * scale
    val cornerRadius = CHIP_CORNER_RADIUS * scale

    val urlLine = VERIFY_PATH + code
    val codeWidth = codePaint.measureText(code)
    val urlWidth = urlPaint.measureText(urlLine)
    val codeHeight = lineHeight(codePaint)
    val urlHeight = lineHeight(urlPaint)
    val chipWidth = paddingH + max(codeWidth, urlWidth) + paddingH
    val chip = RectF(
      width - edgeInset - chipWidth,
      topInset,
      width - edgeInset,
      topInset + paddingV + codeHeight + lineGap + urlHeight + paddingV,
    )
    fillChip(canvas, chip, cornerRadius)

    val rightEdge = chip.right - paddingH
    val codeTop = chip.top + paddingV
    drawText(canvas, code, codePaint, rightEdge - codeWidth, codeTop)
    drawText(canvas, urlLine, urlPaint, rightEdge - urlWidth, codeTop + codeHeight + lineGap)
  }

  /** Bottom-centre: live count, label, and date. */
  private fun drawCountChip(
    canvas: Canvas,
    overlay: ProofOverlay,
    width: Float,
    height: Float,
    scale: Float,
  ) {
    val paddingH = PADDING_HORIZONTAL * scale
    val paddingV = PADDING_VERTICAL * scale
    val lineGap = LINE_GAP * scale
    val bottomInset = BOTTOM_INSET * scale
    val cornerRadius = CHIP_CORNER_RADIUS * scale

    val countLine = "${overlay.count}  ·  ${overlay.label}"
    val dateLine = dateFormat.format(Date())
    val countWidth = countPaint.measureText(countLine)
    val dateWidth = datePaint.measureText(dateLine)
    val countHeight = lineHeight(countPaint)
    val dateHeight = lineHeight(datePaint)
    val chipWidth = paddingH + max(countWidth, dateWidth) + paddingH
    val chipHeight = paddingV + countHeight + lineGap + dateHeight + paddingV
    val left = (width - chipWidth) / 2
    val top = height - bottomInset - chipHeight
    val chip = RectF(left, top, left + chipWidth, top + chipHeight)
    fillChip(canvas, chip, cornerRadius)

    val countTop = chip.top + paddingV
    drawText(canvas, countLine, countPaint, chip.centerX() - countWidth / 2, countTop)
    drawText(canvas, dateLine, datePaint, chip.centerX() - dateWidth / 2, countTop + countHeight + lineGap)
  }

  private fun fillChip(canvas: Canvas, chip: RectF, cornerRadius: Float) {
    canvas.drawRoundRect(chip, cornerRadius, cornerRadius, chipPaint)
  }

  /** Draws `text` with its top edge (not its baseline) at `top`. */
  private fun drawText(canvas: Canvas, text: String, paint: Paint, left: Float, top: Float) {
    canvas.drawText(text, left, top - paint.fontMetrics.ascent, paint)
  }

  private fun lineHeight(paint: Paint): Float = paint.fontMetrics.let { it.descent - it.ascent }

  private fun scaledPaint(
    baseSize: Float,
    typeface: Typeface,
    alpha: Int = 255,
    scale: Float,
  ): Paint =
    Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      this.alpha = alpha
      textSize = baseSize * scale
      this.typeface = typeface
    }
}
