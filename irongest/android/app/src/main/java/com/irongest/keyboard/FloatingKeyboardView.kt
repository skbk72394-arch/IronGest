/**
 * IronGest - Floating Keyboard View
 * Production-grade index finger air keyboard with QWERTY layout
 *
 * Features:
 * - Full QWERTY keyboard as overlay
 * - Semi-transparent with frosted glass effect
 * - Key hover detection (30px radius)
 * - Pinch gesture for keypress with haptic feedback
 * - Dwell-to-press option (500ms hover)
 * - Laser beam from fingertip to keyboard
 * - Suggestion bar above keyboard
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.keyboard

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.AttributeSet
import android.view.Choreographer
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.annotation.RequiresApi
import java.util.Locale

/**
 * Keyboard mode for single-hand operation
 */
enum class KeyboardMode {
    LEFT_HAND,      // Keyboard positioned for left-hand use (on right side)
    RIGHT_HAND,     // Keyboard positioned for right-hand use (on left side)
    CENTER          // Centered keyboard
}

/**
 * Key press detection method
 */
enum class KeyPressMethod {
    PINCH,          // Pinch gesture triggers keypress
    DWELL,          // Hover for duration triggers keypress
    BOTH            // Either method works
}

/**
 * Custom View for the floating air keyboard.
 * Renders QWERTY layout with hover detection and visual effects.
 */
class FloatingKeyboardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr), Choreographer.FrameCallback {

    companion object {
        private const val TAG = "FloatingKeyboardView"

        // Key dimensions
        private const val KEY_WIDTH_DP = 48f
        private const val KEY_HEIGHT_DP = 48f
        private const val KEY_SPACING_DP = 4f
        private const val KEY_CORNER_RADIUS_DP = 8f

        // Detection thresholds
        private const val HOVER_RADIUS_DP = 30f        // Hover detection radius
        private const val DWELL_TIME_MS = 500L         // Dwell-to-press duration

        // Visual effects
        private const val LASER_WIDTH_DP = 2f
        private const val RIPPLE_MAX_RADIUS_DP = 40f

        // Colors (Iron Man HUD palette)
        private const val KEYBOARD_BG_COLOR = 0xE6000000.toInt()    // Semi-transparent black
        private const val KEY_BG_COLOR = 0x40000000.toInt()         // Key background
        private const val KEY_HOVER_COLOR = 0x8000D4FF.toInt()      // Hover state (cyan)
        private const val KEY_PRESSED_COLOR = 0xFF00D4FF.toInt()    // Pressed state
        private const val TEXT_COLOR = 0xFFFFFFFF.toInt()           // White text
        private const val LASER_COLOR = 0xFF00D4FF.toInt()          // Cyan laser
        private const val SUGGESTION_BG_COLOR = 0x60000000.toInt()  // Suggestion bar bg
    }

    // ============================================================================
    // Dimensions
    // ============================================================================

    private val density = context.resources.displayMetrics.density
    private val keyWidth = KEY_WIDTH_DP * density
    private val keyHeight = KEY_HEIGHT_DP * density
    private val keySpacing = KEY_SPACING_DP * density
    private val keyCornerRadius = KEY_CORNER_RADIUS_DP * density
    private val hoverRadius = HOVER_RADIUS_DP * density
    private val laserWidth = LASER_WIDTH_DP * density
    private val rippleMaxRadius = RIPPLE_MAX_RADIUS_DP * density

    // ============================================================================
    // Keyboard Layout
    // ============================================================================

    private val fingerKeyMap = FingerKeyMap()

    // Keyboard rows (standard QWERTY)
    private val keyboardRows: List<List<String>> = listOf(
        listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="),
        listOf("Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"),
        listOf("A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"),
        listOf("Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "⌫")
    )

    // Special keys
    private val specialKeyWidths: Map<String, Float> = mapOf(
        "⌫" to keyWidth * 1.5f,
        "↵" to keyWidth * 1.5f,
        "⇧" to keyWidth * 1.5f,
        "␣" to keyWidth * 5f
    )

    // ============================================================================
    // State
    // ============================================================================

    private var keyboardMode = KeyboardMode.CENTER
    private var pressMethod = KeyPressMethod.BOTH
    private var isShiftActive = false
    private var isCapsLock = false

    // Finger position (normalized 0-1)
    private var fingerX = 0f
    private var fingerY = 0f
    private var fingerVisible = false

    // Finger screen position for laser
    private var fingerScreenX = 0f
    private var fingerScreenY = 0f

    // Current hovered key
    private var hoveredKey: String? = null
    private var pressedKey: String? = null

    // Dwell detection
    private var dwellStartTime = 0L
    private var dwellProgress = 0f
    private var isDwelling = false

    // Ripple animation
    private var rippleX = 0f
    private var rippleY = 0f
    private var rippleRadius = 0f
    private var rippleAlpha = 0f
    private var isRippleAnimating = false

    // Suggestions
    private var suggestions: List<String> = emptyList()

    // ============================================================================
    // Paints
    // ============================================================================

    private val keyboardBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = KEYBOARD_BG_COLOR
    }

    private val keyBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = KEY_BG_COLOR
    }

    private val keyHoverPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = KEY_HOVER_COLOR
    }

    private val keyPressedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = KEY_PRESSED_COLOR
    }

    private val keyTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = TEXT_COLOR
        textSize = 18f * density
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
    }

    private val laserPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = laserWidth
        color = LASER_COLOR
        strokeCap = Paint.Cap.ROUND
        setShadowLayer(8f * density, 0f, 0f, LASER_COLOR)
    }

    private val suggestionBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = SUGGESTION_BG_COLOR
    }

    private val suggestionTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = TEXT_COLOR
        textSize = 14f * density
        textAlign = Paint.Align.CENTER
    }

    private val ripplePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f * density
        color = KEY_PRESSED_COLOR
    }

    private val dwellPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f * density
        strokeCap = Paint.Cap.ROUND
        color = KEY_PRESSED_COLOR
    }

    // Drawing helpers
    private val rectF = RectF()
    private val path = Path()

    // System services
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    private val handler = Handler(Looper.getMainLooper())
    private val choreographer = Choreographer.getInstance()

    // ============================================================================
    // Callbacks
    // ============================================================================

    private var onKeyPressed: ((key: String, character: Char) -> Unit)? = null
    private var onSuggestionSelected: ((suggestion: String) -> Unit)? = null

    // ============================================================================
    // Initialization
    // ============================================================================

    init {
        setLayerType(LAYER_TYPE_HARDWARE, null)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        choreographer.postFrameCallback(this)
    }

    override fun onDetachedFromWindow() {
        choreographer.removeFrameCallback(this)
        super.onDetachedFromWindow()
    }

    // ============================================================================
    // Measurement
    // ============================================================================

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        // Calculate keyboard dimensions
        val rows = keyboardRows.size
        val suggestionBarHeight = keyHeight * 0.6f

        val totalHeight = (rows * keyHeight + (rows - 1) * keySpacing + suggestionBarHeight).toInt()
        val totalWidth = (12 * keyWidth + 11 * keySpacing).toInt()  // Max row width

        setMeasuredDimension(totalWidth, totalHeight)
    }

    // ============================================================================
    // Drawing
    // ============================================================================

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Draw keyboard background with frosted glass effect
        drawKeyboardBackground(canvas)

        // Draw suggestions bar
        drawSuggestionsBar(canvas)

        // Draw keys
        drawKeys(canvas)

        // Draw laser beam from finger
        if (fingerVisible) {
            drawLaserBeam(canvas)
        }

        // Draw ripple animation
        if (isRippleAnimating) {
            drawRipple(canvas)
        }

        // Draw dwell progress
        if (isDwelling && hoveredKey != null) {
            drawDwellProgress(canvas)
        }
    }

    /**
     * Draw keyboard background with frosted glass effect
     */
    private fun drawKeyboardBackground(canvas: Canvas) {
        val bgRect = RectF(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRoundRect(bgRect, 16f * density, 16f * density, keyboardBgPaint)

        // Add subtle gradient overlay for glass effect
        val gradientPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, 0f, height.toFloat(),
                Color.TRANSPARENT,
                0x10000000,
                Shader.TileMode.CLAMP
            )
        }
        canvas.drawRect(bgRect, gradientPaint)
    }

    /**
     * Draw suggestions bar
     */
    private fun drawSuggestionsBar(canvas: Canvas) {
        val barHeight = keyHeight * 0.6f
        val barRect = RectF(0f, 0f, width.toFloat(), barHeight)
        canvas.drawRoundRect(barRect, 16f * density, 16f * density, suggestionBgPaint)

        // Draw suggestions
        if (suggestions.isNotEmpty()) {
            val suggestionWidth = width / suggestions.size.coerceAtLeast(1)
            suggestions.forEachIndexed { index, suggestion ->
                val x = suggestionWidth * (index + 0.5f)
                val y = barHeight * 0.6f
                canvas.drawText(suggestion, x, y, suggestionTextPaint)
            }
        }
    }

    /**
     * Draw all keys
     */
    private fun drawKeys(canvas: Canvas) {
        val startY = keyHeight * 0.6f + keySpacing  // Below suggestions bar

        keyboardRows.forEachIndexed { rowIndex, row ->
            val y = startY + rowIndex * (keyHeight + keySpacing)

            // Calculate row offset for staggered layout
            val rowOffset = when (rowIndex) {
                1 -> keyWidth * 0.3f  // Top row offset
                2 -> keyWidth * 0.5f  // Home row offset
                3 -> keyWidth * 0.7f  // Bottom row offset
                else -> 0f
            }

            row.forEachIndexed { keyIndex, key ->
                val keyWidthOverride = specialKeyWidths[key] ?: keyWidth
                val x = rowOffset + keyIndex * (keyWidth + keySpacing)

                drawKey(canvas, key, x, y, keyWidthOverride)
            }
        }

        // Draw space bar row
        drawSpaceBar(canvas, startY + 4 * (keyHeight + keySpacing))
    }

    /**
     * Draw a single key
     */
    private fun drawKey(canvas: Canvas, key: String, x: Float, y: Float, keyWidthOverride: Float) {
        // Determine key state
        val isHovered = key == hoveredKey
        val isPressed = key == pressedKey

        // Choose paint based on state
        val paint = when {
            isPressed -> keyPressedPaint
            isHovered -> keyHoverPaint
            else -> keyBgPaint
        }

        // Draw key background
        rectF.set(x, y, x + keyWidthOverride, y + keyHeight)
        canvas.drawRoundRect(rectF, keyCornerRadius, keyCornerRadius, paint)

        // Draw hover glow
        if (isHovered && !isPressed) {
            val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = KEY_HOVER_COLOR
                alpha = 100
            }
            canvas.drawRoundRect(rectF, keyCornerRadius, keyCornerRadius, glowPaint)
        }

        // Draw key text
        val text = getDisplayText(key)
        val textX = x + keyWidthOverride / 2
        val textY = y + keyHeight / 2 + keyTextPaint.textSize / 3

        keyTextPaint.alpha = if (isPressed) 255 else 200
        canvas.drawText(text, textX, textY, keyTextPaint)
    }

    /**
     * Draw space bar
     */
    private fun drawSpaceBar(canvas: Canvas, y: Float) {
        val spaceBarWidth = width * 0.5f
        val spaceBarX = (width - spaceBarWidth) / 2

        val isHovered = "␣" == hoveredKey
        val isPressed = "␣" == pressedKey

        val paint = when {
            isPressed -> keyPressedPaint
            isHovered -> keyHoverPaint
            else -> keyBgPaint
        }

        rectF.set(spaceBarX, y, spaceBarX + spaceBarWidth, y + keyHeight)
        canvas.drawRoundRect(rectF, keyCornerRadius, keyCornerRadius, paint)

        // Draw "SPACE" label
        keyTextPaint.textSize = 12f * density
        canvas.drawText("SPACE", width / 2f, y + keyHeight / 2 + 5 * density, keyTextPaint)
        keyTextPaint.textSize = 18f * density  // Reset
    }

    /**
     * Draw laser beam from finger to hovered key
     */
    private fun drawLaserBeam(canvas: Canvas) {
        if (hoveredKey == null) return

        // Find hovered key position
        val keyPos = findKeyPosition(hoveredKey!!) ?: return

        // Calculate finger position relative to view
        val fingerViewX = fingerScreenX - x
        val fingerViewY = fingerScreenY - y - keyHeight  // Offset to fingertip

        // Draw laser beam with gradient
        val gradientPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = laserWidth
            strokeCap = Paint.Cap.ROUND
            shader = LinearGradient(
                fingerViewX, fingerViewY,
                keyPos.first, keyPos.second,
                intArrayOf(
                    Color.TRANSPARENT,
                    LASER_COLOR,
                    Color.WHITE,
                    LASER_COLOR
                ),
                floatArrayOf(0f, 0.3f, 0.5f, 1f),
                Shader.TileMode.CLAMP
            )
            setShadowLayer(6f * density, 0f, 0f, LASER_COLOR)
        }

        canvas.drawLine(fingerViewX, fingerViewY, keyPos.first, keyPos.second, gradientPaint)

        // Draw endpoint glow
        canvas.drawCircle(keyPos.first, keyPos.second, 6f * density, laserPaint)
    }

    /**
     * Draw ripple animation
     */
    private fun drawRipple(canvas: Canvas) {
        ripplePaint.alpha = (rippleAlpha * 255).toInt()
        canvas.drawCircle(rippleX, rippleY, rippleRadius, ripplePaint)
    }

    /**
     * Draw dwell progress ring
     */
    private fun drawDwellProgress(canvas: Canvas) {
        val keyPos = findKeyPosition(hoveredKey!!) ?: return

        val radius = (keyWidth.coerceAtLeast(keyHeight) / 2) + 5 * density
        val sweepAngle = 360f * dwellProgress

        rectF.set(
            keyPos.first - radius,
            keyPos.second - radius,
            keyPos.first + radius,
            keyPos.second + radius
        )

        canvas.drawArc(rectF, -90f, sweepAngle, false, dwellPaint)
    }

    // ============================================================================
    // Key Position Helpers
    // ============================================================================

    /**
     * Find the screen position of a key
     */
    private fun findKeyPosition(key: String): Pair<Float, Float>? {
        val startY = keyHeight * 0.6f + keySpacing

        keyboardRows.forEachIndexed { rowIndex, row ->
            val keyIndex = row.indexOf(key)
            if (keyIndex >= 0) {
                val y = startY + rowIndex * (keyHeight + keySpacing) + keyHeight / 2
                val rowOffset = when (rowIndex) {
                    1 -> keyWidth * 0.3f
                    2 -> keyWidth * 0.5f
                    3 -> keyWidth * 0.7f
                    else -> 0f
                }
                val keyWidthOverride = specialKeyWidths[key] ?: keyWidth
                val x = rowOffset + keyIndex * (keyWidth + keySpacing) + keyWidthOverride / 2
                return Pair(x, y)
            }
        }

        // Check space bar
        if (key == "␣") {
            return Pair(width / 2f, startY + 4 * (keyHeight + keySpacing) + keyHeight / 2)
        }

        return null
    }

    /**
     * Find the key at a position
     */
    private fun findKeyAt(x: Float, y: Float): String? {
        val startY = keyHeight * 0.6f + keySpacing

        keyboardRows.forEachIndexed { rowIndex, row ->
            val rowY = startY + rowIndex * (keyHeight + keySpacing)
            if (y in rowY..(rowY + keyHeight)) {
                val rowOffset = when (rowIndex) {
                    1 -> keyWidth * 0.3f
                    2 -> keyWidth * 0.5f
                    3 -> keyWidth * 0.7f
                    else -> 0f
                }

                row.forEachIndexed { keyIndex, key ->
                    val keyWidthOverride = specialKeyWidths[key] ?: keyWidth
                    val keyX = rowOffset + keyIndex * (keyWidth + keySpacing)
                    if (x in keyX..(keyX + keyWidthOverride)) {
                        return key
                    }
                }
            }
        }

        return null
    }

    /**
     * Get display text for a key
     */
    private fun getDisplayText(key: String): String {
        return when (key) {
            "⌫" -> "⌫"
            "↵" -> "↵"
            "␣" -> "␣"
            "⇧" -> "⇧"
            else -> {
                val char = key.first()
                if (isShiftActive || isCapsLock) {
                    char.uppercaseChar().toString()
                } else {
                    char.lowercaseChar().toString()
                }
            }
        }
    }

    // ============================================================================
    // Frame Callback
    // ============================================================================

    override fun doFrame(frameTimeNanos: Long) {
        if (isDwelling) {
            val elapsed = System.currentTimeMillis() - dwellStartTime
            dwellProgress = (elapsed.toFloat() / DWELL_TIME_MS).coerceIn(0f, 1f)

            if (dwellProgress >= 1f) {
                performKeyPress()
            }

            invalidate()
        }

        choreographer.postFrameCallback(this)
    }

    // ============================================================================
    // Public API
    // ============================================================================

    /**
     * Update finger position (normalized 0-1)
     */
    fun updateFingerPosition(normalizedX: Float, normalizedY: Float, confidence: Float) {
        // Map to view coordinates
        fingerX = normalizedX * width
        fingerY = normalizedY * height

        // Find hovered key
        val newHoveredKey = findKeyAt(fingerX, fingerY)

        if (newHoveredKey != hoveredKey) {
            // Key changed - reset dwell
            hoveredKey = newHoveredKey
            resetDwell()

            if (newHoveredKey != null && pressMethod != KeyPressMethod.PINCH) {
                startDwell()
            }
        }

        fingerVisible = confidence > 0.5f
        invalidate()
    }

    /**
     * Update finger screen position (for laser beam)
     */
    fun updateFingerScreenPosition(screenX: Float, screenY: Float) {
        fingerScreenX = screenX
        fingerScreenY = screenY
        invalidate()
    }

    /**
     * Set finger visibility
     */
    fun setFingerVisible(visible: Boolean) {
        fingerVisible = visible
        if (!visible) {
            resetDwell()
        }
        invalidate()
    }

    /**
     * Handle pinch gesture (for keypress)
     */
    fun onPinchGesture(pinchDistance: Float) {
        if (pressMethod == KeyPressMethod.PINCH || pressMethod == KeyPressMethod.BOTH) {
            if (pinchDistance < 0.1f && hoveredKey != null) {
                performKeyPress()
            }
        }
    }

    /**
     * Set keyboard mode (affects positioning)
     */
    fun setKeyboardMode(mode: KeyboardMode) {
        keyboardMode = mode
        requestLayout()
        invalidate()
    }

    /**
     * Set key press method
     */
    fun setPressMethod(method: KeyPressMethod) {
        pressMethod = method
    }

    /**
     * Set shift state
     */
    fun setShift(active: Boolean) {
        isShiftActive = active
        invalidate()
    }

    /**
     * Toggle caps lock
     */
    fun toggleCapsLock() {
        isCapsLock = !isCapsLock
        invalidate()
    }

    /**
     * Set suggestions
     */
    fun setSuggestions(suggestions: List<String>) {
        this.suggestions = suggestions.take(3)  // Max 3 suggestions
        invalidate()
    }

    /**
     * Set key press listener
     */
    fun setOnKeyPressedListener(listener: (key: String, character: Char) -> Unit) {
        onKeyPressed = listener
    }

    /**
     * Set suggestion selected listener
     */
    fun setOnSuggestionSelectedListener(listener: (suggestion: String) -> Unit) {
        onSuggestionSelected = listener
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    /**
     * Start dwell timer
     */
    private fun startDwell() {
        dwellStartTime = System.currentTimeMillis()
        isDwelling = true
        dwellProgress = 0f
    }

    /**
     * Reset dwell timer
     */
    private fun resetDwell() {
        isDwelling = false
        dwellProgress = 0f
        dwellStartTime = 0L
    }

    /**
     * Perform key press
     */
    private fun performKeyPress() {
        val key = hoveredKey ?: return

        pressedKey = key
        resetDwell()

        // Trigger haptic feedback
        performHapticFeedback()

        // Start ripple animation
        startRippleAnimation(key)

        // Get character
        val character = getCharacterForKey(key)

        // Notify listener
        onKeyPressed?.invoke(key, character)

        // Reset pressed state after animation
        handler.postDelayed({
            pressedKey = null
            invalidate()
        }, 150)

        // Handle shift auto-reset
        if (isShiftActive && !isCapsLock) {
            isShiftActive = false
        }

        invalidate()
    }

    /**
     * Get character for a key
     */
    private fun getCharacterForKey(key: String): Char {
        return when (key) {
            "⌫" -> '\b'
            "↵" -> '\n'
            "␣" -> ' '
            "⇧" -> '⇧'
            else -> {
                val char = key.first()
                if (isShiftActive || isCapsLock) char.uppercaseChar() else char.lowercaseChar()
            }
        }
    }

    /**
     * Start ripple animation
     */
    private fun startRippleAnimation(key: String) {
        val keyPos = findKeyPosition(key) ?: return

        rippleX = keyPos.first
        rippleY = keyPos.second
        rippleRadius = keyWidth / 2
        rippleAlpha = 1f
        isRippleAnimating = true

        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 300
            interpolator = DecelerateInterpolator()

            addUpdateListener { anim ->
                val value = anim.animatedValue as Float
                rippleRadius = keyWidth / 2 + (rippleMaxRadius - keyWidth / 2) * value
                rippleAlpha = 1f - value
                invalidate()
            }

            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    isRippleAnimating = false
                }
            })

            start()
        }
    }

    /**
     * Perform haptic feedback
     */
    private fun performHapticFeedback() {
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(20)
            }
        }
    }
}
