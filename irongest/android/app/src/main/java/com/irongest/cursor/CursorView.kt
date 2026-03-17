/**
 * IronGest - Cursor View
 * Production-grade Iron Man HUD aesthetic cursor with animations
 *
 * Features:
 * - Inner dot + outer ring design
 * - Click ripple animation
 * - Dwell progress ring (hover-to-click)
 * - Smooth state transitions
 * - Hardware-accelerated rendering
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.cursor

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.os.Build
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.annotation.ColorInt
import androidx.annotation.RequiresApi

/**
 * Custom View for rendering the Iron Man HUD-style cursor.
 * Features animated inner dot, outer ring, click ripple, and dwell progress.
 */
class CursorView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        private const val TAG = "CursorView"

        // Default dimensions (in dp)
        private const val DEFAULT_CURSOR_SIZE_DP = 48f
        private const val DEFAULT_INNER_DOT_RADIUS_DP = 6f
        private const val DEFAULT_OUTER_RING_RADIUS_DP = 14f
        private const val DEFAULT_OUTER_RING_WIDTH_DP = 2f
        private const val DEFAULT_RIPPLE_MAX_RADIUS_DP = 30f

        // Default colors (Iron Man HUD palette)
        private const val DEFAULT_PRIMARY_COLOR = 0xFF00D4FF.toInt()      // Cyan blue
        private const val DEFAULT_SECONDARY_COLOR = 0xFF0099CC.toInt()    // Darker cyan
        private const val DEFAULT_ACCENT_COLOR = 0xFFFFFFFF.toInt()       // White
        private const val DEFAULT_GLOW_COLOR = 0x4000D4FF.toInt()         // Cyan glow (transparent)
    }

    // ============================================================================
    // Dimensions
    // ============================================================================

    private val density = context.resources.displayMetrics.density

    // Cursor size (total view size)
    var cursorSize: Int = (DEFAULT_CURSOR_SIZE_DP * density).toInt()
        private set

    // Inner dot
    private var innerDotRadius = DEFAULT_INNER_DOT_RADIUS_DP * density
    private var innerDotRadiusAnimated = innerDotRadius

    // Outer ring
    private var outerRingRadius = DEFAULT_OUTER_RING_RADIUS_DP * density
    private var outerRingRadiusAnimated = outerRingRadius
    private var outerRingWidth = DEFAULT_OUTER_RING_WIDTH_DP * density

    // Dwell progress ring
    private var dwellProgressRingRadius = outerRingRadius + 4 * density
    private var dwellProgressWidth = 3f * density

    // Ripple
    private var rippleMaxRadius = DEFAULT_RIPPLE_MAX_RADIUS_DP * density
    private var rippleCurrentRadius = 0f
    private var rippleAlpha = 0f

    // ============================================================================
    // Colors
    // ============================================================================

    @ColorInt
    private var primaryColor = DEFAULT_PRIMARY_COLOR

    @ColorInt
    private var secondaryColor = DEFAULT_SECONDARY_COLOR

    @ColorInt
    private var accentColor = DEFAULT_ACCENT_COLOR

    @ColorInt
    private var glowColor = DEFAULT_GLOW_COLOR

    // ============================================================================
    // State
    // ============================================================================

    private var cursorState: CursorState = CursorState.IDLE
    private var dwellProgress: Float = 0f
    private var isClickAnimating = false
    private var isRippleAnimating = false

    // ============================================================================
    // Paint Objects
    // ============================================================================

    // Inner dot paint with gradient
    private val innerDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        isDither = true
    }

    // Outer ring paint
    private val outerRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = outerRingWidth
        isDither = true
    }

    // Dwell progress paint
    private val dwellProgressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = dwellProgressWidth
        strokeCap = Paint.Cap.ROUND
        isDither = true
    }

    // Dwell background paint (track)
    private val dwellBackgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = dwellProgressWidth
        strokeCap = Paint.Cap.ROUND
        color = 0x20000000
    }

    // Ripple paint
    private val ripplePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f * density
    }

    // Glow paint
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        isDither = true
    }

    // ============================================================================
    // Drawing Helpers
    // ============================================================================

    private val rectF = RectF()
    private val path = Path()
    private val matrix = Matrix()

    // Center point
    private var centerX = 0f
    private var centerY = 0f

    // ============================================================================
    // Animators
    // ============================================================================

    private var clickAnimator: ValueAnimator? = null
    private var rippleAnimator: ValueAnimator? = null
    private var pulseAnimator: ValueAnimator? = null

    // ============================================================================
    // Initialization
    // ============================================================================

    init {
        // Set up hardware layer for smooth animations
        setLayerType(LAYER_TYPE_HARDWARE, null)

        // Initialize paints
        updatePaints()

        // Start idle pulse animation
        startPulseAnimation()
    }

    /**
     * Update paint objects with current colors
     */
    private fun updatePaints() {
        // Inner dot gradient
        innerDotPaint.shader = RadialGradient(
            0f, 0f, innerDotRadiusAnimated,
            accentColor,
            primaryColor,
            Shader.TileMode.CLAMP
        )

        // Outer ring
        outerRingPaint.color = primaryColor

        // Dwell progress
        dwellProgressPaint.color = accentColor

        // Ripple
        ripplePaint.color = primaryColor

        // Glow gradient
        glowPaint.shader = RadialGradient(
            0f, 0f, outerRingRadiusAnimated * 1.5f,
            glowColor,
            Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
    }

    // ============================================================================
    // Measurement
    // ============================================================================

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(cursorSize, cursorSize)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        centerX = w / 2f
        centerY = h / 2f
        rectF.set(
            centerX - dwellProgressRingRadius,
            centerY - dwellProgressRingRadius,
            centerX + dwellProgressRingRadius,
            centerY + dwellProgressRingRadius
        )
    }

    // ============================================================================
    // Drawing
    // ============================================================================

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Draw glow effect
        drawGlow(canvas)

        // Draw ripple animation
        if (isRippleAnimating) {
            drawRipple(canvas)
        }

        // Draw dwell progress background track
        if (dwellProgress > 0 || cursorState == CursorState.DWELLING) {
            drawDwellBackground(canvas)
        }

        // Draw dwell progress
        if (dwellProgress > 0) {
            drawDwellProgress(canvas)
        }

        // Draw outer ring
        drawOuterRing(canvas)

        // Draw inner dot
        drawInnerDot(canvas)

        // Draw state-specific decorations
        drawStateDecorations(canvas)
    }

    /**
     * Draw the glow effect around the cursor
     */
    private fun drawGlow(canvas: Canvas) {
        canvas.save()
        canvas.translate(centerX, centerY)
        canvas.drawCircle(0f, 0f, outerRingRadiusAnimated * 1.5f, glowPaint)
        canvas.restore()
    }

    /**
     * Draw the outer ring
     */
    private fun drawOuterRing(canvas: Canvas) {
        canvas.save()
        canvas.translate(centerX, centerY)

        // Draw the main ring
        canvas.drawCircle(0f, 0f, outerRingRadiusAnimated, outerRingPaint)

        // Draw decorative arcs for Iron Man HUD style
        val arcAngle = when (cursorState) {
            CursorState.HOVERING, CursorState.DWELLING -> 45f
            CursorState.DRAGGING -> 90f
            CursorState.CLICKING -> 135f
            else -> 30f
        }

        // Top arc
        canvas.save()
        canvas.rotate(-45f)
        canvas.drawArc(
            -outerRingRadiusAnimated, -outerRingRadiusAnimated,
            outerRingRadiusAnimated, outerRingRadiusAnimated,
            -arcAngle / 2, arcAngle, false, outerRingPaint
        )
        canvas.restore()

        // Bottom arc
        canvas.save()
        canvas.rotate(135f)
        canvas.drawArc(
            -outerRingRadiusAnimated, -outerRingRadiusAnimated,
            outerRingRadiusAnimated, outerRingRadiusAnimated,
            -arcAngle / 2, arcAngle, false, outerRingPaint
        )
        canvas.restore()

        canvas.restore()
    }

    /**
     * Draw the inner dot
     */
    private fun drawInnerDot(canvas: Canvas) {
        canvas.save()
        canvas.translate(centerX, centerY)

        // Draw dot with gradient
        canvas.drawCircle(0f, 0f, innerDotRadiusAnimated, innerDotPaint)

        // Draw center highlight
        val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = Color.WHITE
            alpha = 180
        }
        canvas.drawCircle(
            -innerDotRadiusAnimated * 0.2f,
            -innerDotRadiusAnimated * 0.2f,
            innerDotRadiusAnimated * 0.3f,
            highlightPaint
        )

        canvas.restore()
    }

    /**
     * Draw the click ripple animation
     */
    private fun drawRipple(canvas: Canvas) {
        canvas.save()
        canvas.translate(centerX, centerY)

        ripplePaint.alpha = (rippleAlpha * 255).toInt()
        canvas.drawCircle(0f, 0f, rippleCurrentRadius, ripplePaint)

        canvas.restore()
    }

    /**
     * Draw the dwell progress background track
     */
    private fun drawDwellBackground(canvas: Canvas) {
        canvas.drawArc(rectF, 0f, 360f, false, dwellBackgroundPaint)
    }

    /**
     * Draw the dwell progress arc
     */
    private fun drawDwellProgress(canvas: Canvas) {
        val sweepAngle = 360f * dwellProgress
        canvas.drawArc(rectF, -90f, sweepAngle, false, dwellProgressPaint)
    }

    /**
     * Draw state-specific decorations
     */
    private fun drawStateDecorations(canvas: Canvas) {
        when (cursorState) {
            CursorState.DRAGGING -> {
                // Draw drag indicator lines
                canvas.save()
                canvas.translate(centerX, centerY)

                val dragPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.STROKE
                    strokeWidth = 1.5f * density
                    color = primaryColor
                    alpha = 150
                }

                // Cross lines
                for (angle in listOf(0f, 90f, 180f, 270f)) {
                    canvas.save()
                    canvas.rotate(angle)
                    canvas.drawLine(
                        outerRingRadiusAnimated + 5 * density,
                        0f,
                        outerRingRadiusAnimated + 12 * density,
                        0f,
                        dragPaint
                    )
                    canvas.restore()
                }

                canvas.restore()
            }

            CursorState.SCROLLING -> {
                // Draw scroll indicator arrows
                canvas.save()
                canvas.translate(centerX, centerY)

                val scrollPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.FILL
                    color = primaryColor
                    alpha = 180
                }

                // Up arrow
                path.reset()
                path.moveTo(0f, -outerRingRadiusAnimated - 8 * density)
                path.lineTo(-4 * density, -outerRingRadiusAnimated - 3 * density)
                path.lineTo(4 * density, -outerRingRadiusAnimated - 3 * density)
                path.close()
                canvas.drawPath(path, scrollPaint)

                // Down arrow
                path.reset()
                path.moveTo(0f, outerRingRadiusAnimated + 8 * density)
                path.lineTo(-4 * density, outerRingRadiusAnimated + 3 * density)
                path.lineTo(4 * density, outerRingRadiusAnimated + 3 * density)
                path.close()
                canvas.drawPath(path, scrollPaint)

                canvas.restore()
            }

            else -> {}
        }
    }

    // ============================================================================
    // Public API
    // ============================================================================

    /**
     * Set cursor color
     */
    fun setCursorColor(@ColorInt color: Int) {
        primaryColor = color
        secondaryColor = darkenColor(color, 0.8f)
        glowColor = (color and 0x00FFFFFF) or 0x40000000.toInt()

        updatePaints()
        invalidate()
    }

    /**
     * Set cursor size (in dp)
     */
    fun setCursorSize(sizeDp: Float) {
        cursorSize = (sizeDp * density).toInt()
        requestLayout()
    }

    /**
     * Set cursor state
     */
    fun setCursorState(state: CursorState) {
        if (cursorState != state) {
            cursorState = state
            onStateChanged(state)
            invalidate()
        }
    }

    /**
     * Set dwell progress (0-1)
     */
    fun setDwellProgress(progress: Float) {
        dwellProgress = progress.coerceIn(0f, 1f)
        invalidate()
    }

    /**
     * Perform click animation
     */
    fun performClickAnimation() {
        if (isClickAnimating) return

        isClickAnimating = true
        clickAnimator?.cancel()

        clickAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 150
            interpolator = OvershootInterpolator(2f)

            addUpdateListener { animator ->
                val value = animator.animatedValue as Float
                innerDotRadiusAnimated = innerDotRadius * (1f - 0.3f * value)
                outerRingRadiusAnimated = outerRingRadius * (1f + 0.2f * value)
                updatePaints()
                invalidate()
            }

            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    innerDotRadiusAnimated = innerDotRadius
                    outerRingRadiusAnimated = outerRingRadius
                    updatePaints()
                    isClickAnimating = false
                    invalidate()
                }
            })

            start()
        }
    }

    /**
     * Perform ripple animation
     */
    fun performRippleAnimation() {
        if (isRippleAnimating) return

        isRippleAnimating = true
        rippleAnimator?.cancel()

        rippleCurrentRadius = outerRingRadius
        rippleAlpha = 1f

        rippleAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 300
            interpolator = DecelerateInterpolator()

            addUpdateListener { animator ->
                val value = animator.animatedValue as Float
                rippleCurrentRadius = outerRingRadius + (rippleMaxRadius - outerRingRadius) * value
                rippleAlpha = 1f - value
                invalidate()
            }

            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    isRippleAnimating = false
                    rippleAlpha = 0f
                    invalidate()
                }
            })

            start()
        }
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    /**
     * Handle cursor state change
     */
    private fun onStateChanged(newState: CursorState) {
        // Adjust pulse animation based on state
        pulseAnimator?.cancel()

        when (newState) {
            CursorState.IDLE -> {
                startPulseAnimation()
            }

            CursorState.HOVERING -> {
                // Subtle pulse
                animateRingScale(1.1f, 200)
            }

            CursorState.DWELLING -> {
                // Intensify pulse
                animateRingScale(1.15f, 150)
            }

            CursorState.CLICKING -> {
                performClickAnimation()
                performRippleAnimation()
            }

            CursorState.DRAGGING -> {
                animateRingScale(1.2f, 100)
            }

            CursorState.SCROLLING -> {
                animateRingScale(1.15f, 100)
            }

            CursorState.DISABLED -> {
                // Dim the cursor
                alpha = 0.3f
            }
        }

        if (newState != CursorState.DISABLED) {
            alpha = 1f
        }
    }

    /**
     * Start idle pulse animation
     */
    private fun startPulseAnimation() {
        pulseAnimator?.cancel()

        pulseAnimator = ValueAnimator.ofFloat(0f, 1f, 0f).apply {
            duration = 2000
            repeatMode = ValueAnimator.RESTART
            repeatCount = ValueAnimator.INFINITE
            interpolator = DecelerateInterpolator()

            addUpdateListener { animator ->
                val value = animator.animatedValue as Float
                outerRingRadiusAnimated = outerRingRadius * (1f + 0.05f * value)
                updatePaints()
                invalidate()
            }

            start()
        }
    }

    /**
     * Animate ring scale
     */
    private fun animateRingScale(targetScale: Float, duration: Long) {
        val startRadius = outerRingRadiusAnimated
        val targetRadius = outerRingRadius * targetScale

        ValueAnimator.ofFloat(0f, 1f).apply {
            this.duration = duration
            interpolator = OvershootInterpolator(1.5f)

            addUpdateListener { animator ->
                val value = animator.animatedValue as Float
                outerRingRadiusAnimated = startRadius + (targetRadius - startRadius) * value
                updatePaints()
                invalidate()
            }

            start()
        }
    }

    /**
     * Darken a color
     */
    private fun darkenColor(@ColorInt color: Int, factor: Float): Int {
        val r = (Color.red(color) * factor).toInt().coerceIn(0, 255)
        val g = (Color.green(color) * factor).toInt().coerceIn(0, 255)
        val b = (Color.blue(color) * factor).toInt().coerceIn(0, 255)
        return Color.argb(Color.alpha(color), r, g, b)
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    /**
     * Clean up resources
     */
    fun cleanup() {
        clickAnimator?.cancel()
        rippleAnimator?.cancel()
        pulseAnimator?.cancel()
    }

    override fun onDetachedFromWindow() {
        cleanup()
        super.onDetachedFromWindow()
    }
}
