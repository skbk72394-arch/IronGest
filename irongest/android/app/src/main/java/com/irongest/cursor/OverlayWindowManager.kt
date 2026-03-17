/**
 * IronGest - Overlay Window Manager
 * Production-grade system-wide cursor overlay using TYPE_ACCESSIBILITY_OVERLAY
 * Works across ALL apps without root access
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.cursor

import android.content.Context
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.Choreographer
import android.view.Display
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.WindowManager.LayoutParams
import androidx.annotation.RequiresApi
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Manages the system-wide cursor overlay window that works across all applications.
 * Uses TYPE_ACCESSIBILITY_OVERLAY for system-wide coverage without root.
 *
 * Features:
 * - 60fps cursor updates using Choreographer
 * - Multi-display support
 * - Edge resistance for cursor bounds
 * - Proper window flags for non-interfering overlay
 */
class OverlayWindowManager private constructor(
    private val context: Context
) : Choreographer.FrameCallback {

    companion object {
        private const val TAG = "OverlayWindowManager"

        // Edge resistance factor (0 = no resistance, 1 = full stop)
        private const val EDGE_RESISTANCE_FACTOR = 0.3f

        // Edge zone size in pixels (where resistance starts)
        private const val EDGE_ZONE_PX = 50

        // Maximum cursor velocity (pixels per frame at 60fps)
        private const val MAX_VELOCITY_PER_FRAME = 50f

        @Volatile
        private var instance: OverlayWindowManager? = null

        /**
         * Get singleton instance
         */
        fun getInstance(context: Context): OverlayWindowManager {
            return instance ?: synchronized(this) {
                instance ?: OverlayWindowManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }

    // Window Management
    private val windowManager: WindowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    private val displayManager: DisplayManager =
        context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager

    // Cursor View
    private var cursorView: CursorView? = null
    private var windowLayoutParams: LayoutParams? = null

    // Frame Callback
    private val choreographer = Choreographer.getInstance()
    private val isRunning = AtomicBoolean(false)

    // Display Info
    private var screenWidth = 0
    private var screenHeight = 0
    private var statusBarHeight = 0
    private var navigationBarHeight = 0
    private var displayDensity = 1.0f

    // Cursor State
    private var currentX = 0f
    private var currentY = 0f
    private var targetX = 0f
    private var targetY = 0f
    private var velocityX = 0f
    private var velocityY = 0f

    // Interpolation factor (0 = no smoothing, 1 = instant)
    private var lerpFactor = 0.3f

    // Callbacks
    private var onCursorMovedListener: ((x: Float, y: Float) -> Unit)? = null
    private var onDisplayChangedListener: ((displayId: Int) -> Unit)? = null

    // Multi-display support
    private var currentDisplayId = Display.DEFAULT_DISPLAY
    private val displayListener = object : DisplayManager.DisplayListener {
        override fun onDisplayAdded(displayId: Int) {}
        override fun onDisplayRemoved(displayId: Int) {}
        override fun onDisplayChanged(displayId: Int) {
            if (displayId == currentDisplayId) {
                updateDisplayMetrics()
                onDisplayChangedListener?.invoke(displayId)
            }
        }
    }

    init {
        initializeDisplayMetrics()
        displayManager.registerDisplayListener(displayListener, Handler(Looper.getMainLooper()))
    }

    /**
     * Initialize display metrics for the current display
     */
    private fun initializeDisplayMetrics() {
        val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            context.display ?: windowManager.defaultDisplay
        } else {
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay
        }

        val metrics = DisplayMetrics()
        display.getRealMetrics(metrics)

        screenWidth = metrics.widthPixels
        screenHeight = metrics.heightPixels
        displayDensity = metrics.density

        // Get system bar heights
        statusBarHeight = getSystemBarHeight("status_bar_height")
        navigationBarHeight = getSystemBarHeight("navigation_bar_height")
    }

    /**
     * Get system bar height by resource name
     */
    private fun getSystemBarHeight(resourceName: String): Int {
        val resourceId = context.resources.getIdentifier(
            resourceName,
            "dimen",
            "android"
        )
        return if (resourceId > 0) {
            context.resources.getDimensionPixelSize(resourceId)
        } else {
            0
        }
    }

    /**
     * Update display metrics (called on display changes)
     */
    private fun updateDisplayMetrics() {
        initializeDisplayMetrics()
        // Clamp cursor to new bounds
        currentX = currentX.coerceIn(0f, screenWidth.toFloat())
        currentY = currentY.coerceIn(0f, screenHeight.toFloat())
        targetX = targetX.coerceIn(0f, screenWidth.toFloat())
        targetY = targetY.coerceIn(0f, screenHeight.toFloat())
    }

    /**
     * Create and show the cursor overlay
     */
    @RequiresApi(Build.VERSION_CODES.M)
    fun showOverlay(): Boolean {
        if (cursorView != null) {
            return true // Already showing
        }

        try {
            // Create cursor view
            cursorView = CursorView(context).apply {
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
            }

            // Window layout params for accessibility overlay
            windowLayoutParams = LayoutParams().apply {
                // TYPE_ACCESSIBILITY_OVERLAY works without SYSTEM_ALERT_WINDOW permission
                // when the accessibility service is enabled
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    LayoutParams.TYPE_SYSTEM_ALERT
                }

                // Window flags
                flags = flags or
                    LayoutParams.FLAG_NOT_FOCUSABLE or          // Don't receive key events
                    LayoutParams.FLAG_NOT_TOUCH_MODAL or        // Let touches pass through
                    LayoutParams.FLAG_LAYOUT_IN_SCREEN or       // Cover entire screen
                    LayoutParams.FLAG_LAYOUT_NO_LIMITS or       // Allow positioning outside bounds
                    LayoutParams.FLAG_HARDWARE_ACCELERATED      // Hardware acceleration

                // Format for transparency
                format = PixelFormat.TRANSLUCENT

                // Position at top-left (we'll move via layout params)
                gravity = Gravity.TOP or Gravity.START

                // Size - wrap content but the view draws the cursor
                width = LayoutParams.WRAP_CONTENT
                height = LayoutParams.WRAP_CONTENT

                // Initial position
                x = 0
                y = 0

                // Title for debugging
                @Suppress("DEPRECATION")
                title = "IronGest Cursor"
            }

            // Add view to window
            windowManager.addView(cursorView, windowLayoutParams)

            // Start frame callback
            startFrameCallback()

            return true

        } catch (e: Exception) {
            cursorView = null
            windowLayoutParams = null
            return false
        }
    }

    /**
     * Hide and remove the cursor overlay
     */
    fun hideOverlay() {
        stopFrameCallback()

        cursorView?.let { view ->
            try {
                windowManager.removeViewImmediate(view)
            } catch (e: Exception) {
                // View might already be removed
            }
        }

        cursorView = null
        windowLayoutParams = null
    }

    /**
     * Start the Choreographer frame callback for 60fps updates
     */
    private fun startFrameCallback() {
        if (isRunning.compareAndSet(false, true)) {
            choreographer.postFrameCallback(this)
        }
    }

    /**
     * Stop the Choreographer frame callback
     */
    private fun stopFrameCallback() {
        if (isRunning.compareAndSet(true, false)) {
            choreographer.removeFrameCallback(this)
        }
    }

    /**
     * Choreographer frame callback - updates cursor position at 60fps
     */
    override fun doFrame(frameTimeNanos: Long) {
        if (!isRunning.get()) return

        // Update cursor position with interpolation
        updateCursorPosition()

        // Update the view
        updateViewPosition()

        // Schedule next frame
        choreographer.postFrameCallback(this)
    }

    /**
     * Update cursor position using smooth interpolation
     */
    private fun updateCursorPosition() {
        // Calculate interpolated position
        val newX = lerp(currentX, targetX, lerpFactor)
        val newY = lerp(currentY, targetY, lerpFactor)

        // Apply velocity-based smoothing
        velocityX = newX - currentX
        velocityY = newY - currentY

        // Clamp velocity
        velocityX = velocityX.coerceIn(-MAX_VELOCITY_PER_FRAME, MAX_VELOCITY_PER_FRAME)
        velocityY = velocityY.coerceIn(-MAX_VELOCITY_PER_FRAME, MAX_VELOCITY_PER_FRAME)

        // Apply edge resistance
        val edgeResistanceX = calculateEdgeResistance(newX, screenWidth)
        val edgeResistanceY = calculateEdgeResistance(newY, screenHeight)

        currentX = applyEdgeResistance(newX, edgeResistanceX, screenWidth)
        currentY = applyEdgeResistance(newY, edgeResistanceY, screenHeight)

        // Notify listener
        onCursorMovedListener?.invoke(currentX, currentY)
    }

    /**
     * Linear interpolation
     */
    private fun lerp(start: Float, end: Float, factor: Float): Float {
        return start + (end - start) * factor
    }

    /**
     * Calculate edge resistance factor for a position
     */
    private fun calculateEdgeResistance(position: Float, maxPosition: Int): Float {
        val edgeZone = EDGE_ZONE_PX.toFloat()

        return when {
            position < edgeZone -> {
                // Near left/top edge
                1.0f - (position / edgeZone) * EDGE_RESISTANCE_FACTOR
            }
            position > maxPosition - edgeZone -> {
                // Near right/bottom edge
                val distFromEdge = maxPosition - position
                1.0f - (distFromEdge / edgeZone) * EDGE_RESISTANCE_FACTOR
            }
            else -> 1.0f
        }
    }

    /**
     * Apply edge resistance to position
     */
    private fun applyEdgeResistance(
        position: Float,
        resistance: Float,
        maxPosition: Int
    ): Float {
        val clamped = position.coerceIn(0f, maxPosition.toFloat())
        val prevPosition = if (position < maxPosition / 2) currentX else currentY
        return prevPosition + (clamped - prevPosition) * resistance
    }

    /**
     * Update the view position in the window
     */
    private fun updateViewPosition() {
        val view = cursorView ?: return
        val params = windowLayoutParams ?: return

        // Get cursor size for centering
        val cursorWidth = view.cursorSize
        val cursorHeight = view.cursorSize

        // Calculate centered position
        val viewX = (currentX - cursorWidth / 2).toInt()
        val viewY = (currentY - cursorHeight / 2).toInt()

        // Check if position changed
        if (params.x != viewX || params.y != viewY) {
            params.x = viewX
            params.y = viewY

            try {
                windowManager.updateViewLayout(view, params)
            } catch (e: Exception) {
                // View might have been removed
            }
        }
    }

    /**
     * Set the target cursor position (normalized 0-1)
     */
    fun setTargetPosition(normalizedX: Float, normalizedY: Float) {
        targetX = (normalizedX * screenWidth).coerceIn(0f, screenWidth.toFloat())
        targetY = (normalizedY * screenHeight).coerceIn(0f, screenHeight.toFloat())
    }

    /**
     * Set the target cursor position (screen coordinates)
     */
    fun setTargetScreenPosition(x: Float, y: Float) {
        targetX = x.coerceIn(0f, screenWidth.toFloat())
        targetY = y.coerceIn(0f, screenHeight.toFloat())
    }

    /**
     * Get current cursor position
     */
    fun getCurrentPosition(): Pair<Float, Float> = Pair(currentX, currentY)

    /**
     * Set the interpolation factor (smoothing)
     * @param factor 0 = maximum smoothing, 1 = no smoothing (instant)
     */
    fun setLerpFactor(factor: Float) {
        lerpFactor = factor.coerceIn(0.05f, 1.0f)
    }

    /**
     * Set cursor visibility
     */
    fun setCursorVisible(visible: Boolean) {
        cursorView?.visibility = if (visible) View.VISIBLE else View.INVISIBLE
    }

    /**
     * Set cursor color
     */
    fun setCursorColor(color: Int) {
        cursorView?.setCursorColor(color)
    }

    /**
     * Set cursor size
     */
    fun setCursorSize(sizeDp: Float) {
        cursorView?.setCursorSize(sizeDp)
    }

    /**
     * Trigger click animation
     */
    fun triggerClickAnimation() {
        cursorView?.performClickAnimation()
    }

    /**
     * Trigger ripple animation
     */
    fun triggerRippleAnimation() {
        cursorView?.performRippleAnimation()
    }

    /**
     * Set dwell progress (for hover-to-click)
     * @param progress 0-1 progress value
     */
    fun setDwellProgress(progress: Float) {
        cursorView?.setDwellProgress(progress)
    }

    /**
     * Set cursor state
     */
    fun setCursorState(state: CursorState) {
        cursorView?.setCursorState(state)
    }

    /**
     * Get screen dimensions
     */
    fun getScreenDimensions(): Pair<Int, Int> = Pair(screenWidth, screenHeight)

    /**
     * Get display density
     */
    fun getDisplayDensity(): Float = displayDensity

    /**
     * Set cursor moved listener
     */
    fun setOnCursorMovedListener(listener: (x: Float, y: Float) -> Unit) {
        onCursorMovedListener = listener
    }

    /**
     * Set display changed listener
     */
    fun setOnDisplayChangedListener(listener: (displayId: Int) -> Unit) {
        onDisplayChangedListener = listener
    }

    /**
     * Check if overlay is currently showing
     */
    fun isShowing(): Boolean = cursorView != null && isRunning.get()

    /**
     * Release resources
     */
    fun release() {
        hideOverlay()
        displayManager.unregisterDisplayListener(displayListener)
        instance = null
    }
}

/**
 * Cursor state enum
 */
enum class CursorState {
    IDLE,           // Normal cursor (no action pending)
    HOVERING,       // Over a target
    DWELLING,       // Dwell-to-click in progress
    CLICKING,       // Click animation
    DRAGGING,       // Drag mode active
    SCROLLING,      // Scroll mode active
    DISABLED        // Cursor disabled
}
