package expo.modules.quickposecamera

import android.graphics.Bitmap
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
 * Burns the wordmark, verification code, live count and date into each frame
 * so the exported clip is self-evidencing. Layout and sizes match the iOS
 * recorder. Used only from the recorder thread.
 */
internal object ProofChrome {
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
  private const val BRAND = "Healthy"
  private const val VERIFY_PATH = "gethealthyapp.com/v/"

  private val chipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(140, 0, 0, 0) }
  private val pipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(255, 59, 48) }
  private val brandPaint = textPaint(20f, Typeface.DEFAULT_BOLD)
  private val codePaint = textPaint(20f, Typeface.create(Typeface.MONOSPACE, Typeface.BOLD))
  private val urlPaint = textPaint(14f, Typeface.DEFAULT, SECONDARY_ALPHA)
  private val countPaint = textPaint(28f, Typeface.DEFAULT_BOLD)
  private val datePaint = textPaint(16f, Typeface.DEFAULT, SECONDARY_ALPHA)
  private val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG)
  private val dateFormat = DateFormat.getDateInstance(DateFormat.MEDIUM)

  /** Draws the camera image aspect-filled onto `frame`, then the proof chrome on top. */
  fun compose(frame: Bitmap, camera: Bitmap, overlay: ProofOverlay) {
    val canvas = Canvas(frame)
    val width = frame.width.toFloat()
    val height = frame.height.toFloat()
    canvas.drawColor(Color.BLACK)
    drawAspectFill(canvas, camera, width, height)
    drawBrandChip(canvas)
    drawCodeChip(canvas, overlay.code, width)
    drawCountChip(canvas, overlay, width, height)
  }

  private fun drawAspectFill(canvas: Canvas, image: Bitmap, width: Float, height: Float) {
    if (image.width <= 0 || image.height <= 0) return
    val scale = max(width / image.width, height / image.height)
    val drawWidth = image.width * scale
    val drawHeight = image.height * scale
    val left = (width - drawWidth) / 2
    val top = (height - drawHeight) / 2
    canvas.drawBitmap(image, null, RectF(left, top, left + drawWidth, top + drawHeight), bitmapPaint)
  }

  /** Top-left: recording pip and wordmark. */
  private fun drawBrandChip(canvas: Canvas) {
    val textWidth = brandPaint.measureText(BRAND)
    val textHeight = lineHeight(brandPaint)
    val chip = RectF(
      EDGE_INSET,
      TOP_INSET,
      EDGE_INSET + PADDING_HORIZONTAL + PIP_SIZE + PIP_GAP + textWidth + PADDING_HORIZONTAL,
      TOP_INSET + PADDING_VERTICAL + textHeight + PADDING_VERTICAL,
    )
    fillChip(canvas, chip)

    val pipLeft = chip.left + PADDING_HORIZONTAL
    val pipTop = chip.centerY() - PIP_SIZE / 2
    canvas.drawOval(RectF(pipLeft, pipTop, pipLeft + PIP_SIZE, pipTop + PIP_SIZE), pipPaint)
    drawText(canvas, BRAND, brandPaint, pipLeft + PIP_SIZE + PIP_GAP, chip.centerY() - textHeight / 2)
  }

  /** Top-right: code and verify URL so anyone watching knows where to check it. */
  private fun drawCodeChip(canvas: Canvas, code: String, width: Float) {
    val urlLine = VERIFY_PATH + code
    val codeWidth = codePaint.measureText(code)
    val urlWidth = urlPaint.measureText(urlLine)
    val codeHeight = lineHeight(codePaint)
    val urlHeight = lineHeight(urlPaint)
    val chipWidth = PADDING_HORIZONTAL + max(codeWidth, urlWidth) + PADDING_HORIZONTAL
    val chip = RectF(
      width - EDGE_INSET - chipWidth,
      TOP_INSET,
      width - EDGE_INSET,
      TOP_INSET + PADDING_VERTICAL + codeHeight + LINE_GAP + urlHeight + PADDING_VERTICAL,
    )
    fillChip(canvas, chip)

    val rightEdge = chip.right - PADDING_HORIZONTAL
    val codeTop = chip.top + PADDING_VERTICAL
    drawText(canvas, code, codePaint, rightEdge - codeWidth, codeTop)
    drawText(canvas, urlLine, urlPaint, rightEdge - urlWidth, codeTop + codeHeight + LINE_GAP)
  }

  /** Bottom-centre: live count, label, and date. */
  private fun drawCountChip(canvas: Canvas, overlay: ProofOverlay, width: Float, height: Float) {
    val countLine = "${overlay.count}  ·  ${overlay.label}"
    val dateLine = dateFormat.format(Date())
    val countWidth = countPaint.measureText(countLine)
    val dateWidth = datePaint.measureText(dateLine)
    val countHeight = lineHeight(countPaint)
    val dateHeight = lineHeight(datePaint)
    val chipWidth = PADDING_HORIZONTAL + max(countWidth, dateWidth) + PADDING_HORIZONTAL
    val chipHeight = PADDING_VERTICAL + countHeight + LINE_GAP + dateHeight + PADDING_VERTICAL
    val left = (width - chipWidth) / 2
    val top = height - BOTTOM_INSET - chipHeight
    val chip = RectF(left, top, left + chipWidth, top + chipHeight)
    fillChip(canvas, chip)

    val countTop = chip.top + PADDING_VERTICAL
    drawText(canvas, countLine, countPaint, chip.centerX() - countWidth / 2, countTop)
    drawText(canvas, dateLine, datePaint, chip.centerX() - dateWidth / 2, countTop + countHeight + LINE_GAP)
  }

  private fun fillChip(canvas: Canvas, chip: RectF) {
    canvas.drawRoundRect(chip, CHIP_CORNER_RADIUS, CHIP_CORNER_RADIUS, chipPaint)
  }

  /** Draws `text` with its top edge (not its baseline) at `top`. */
  private fun drawText(canvas: Canvas, text: String, paint: Paint, left: Float, top: Float) {
    canvas.drawText(text, left, top - paint.fontMetrics.ascent, paint)
  }

  private fun lineHeight(paint: Paint): Float = paint.fontMetrics.let { it.descent - it.ascent }

  private fun textPaint(size: Float, typeface: Typeface, alpha: Int = 255): Paint =
    Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      this.alpha = alpha
      textSize = size
      this.typeface = typeface
    }
}
