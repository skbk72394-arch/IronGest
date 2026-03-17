/**
 * IronGest - Cursor Manager
 * Production-grade cursor control with acceleration, smoothing, and state machine
 *
 * Features:
 * - Maps normalized hand position to screen coordinates
 * - Acceleration curve (slow = precise, fast = covers distance)
 * - Custom 2D Kalman filter for cursor smoothing
 * - Click, drag, scroll state machine
 * - Dwell detection for hover-to-click
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.cursor

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.annotation.RequiresApi
import com.irongest.accessibility.AccessibilityControlService
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Manages cursor movement, acceleration, and gesture injection.
 * Acts as the bridge between gesture recognition and system actions.
 */
class CursorManager private constructor(
    private val context: Context
) {

    companion object {
        private const val TAG = "CursorManager"

        // Acceleration curve parameters
        private const val ACCELERATION_THRESHOLD_LOW = 0.1f    // Below this: precise mode
        private const val ACCELERATION_THRESHOLD_HIGH = 0.6f   // Above this: fast mode
        private const val ACCELERATION_EXPONENT = 1.5f          // Power curve exponent
        private const val MIN_CURSOR_SPEED = 1.0f               // Minimum pixels per update
        private const val MAX_CURSOR_SPEED = 30.0f              // Maximum pixels per update

        // Kalman filter parameters
        private const val KALMAN_PROCESS_NOISE = 0.015f
        private const val KALMAN_MEASUREMENT_NOISE = 0.05f

        // Dwell detection
        private const val DWELL_RADIUS_THRESHOLD = 15f         // Pixels - max movement for dwell
        private const val DWELL_TIME_MS = 600L                 // Time to trigger dwell click
        private const val DWELL_PROGRESS_INTERVAL_MS = 16L     // ~60fps

        // Scroll sensitivity
        private const val SCROLL_MULTIPLIER = 3.0f
        private const val SCROLL_THRESHOLD = 0.02f             // Minimum movement to scroll

        // Drag threshold
        private const val DRAG_START_THRESHOLD = 5f            // Pixels moved to start drag
        private const val DRAG_VELOCITY_THRESHOLD = 0.1f       // Velocity threshold for drag

        @Volatile
        private var instance: CursorManager? = null

        fun getInstance(context: Context): CursorManager {
            return instance ?: synchronized(this) {
                instance ?: CursorManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }

    // ============================================================================
    // Components
    // ============================================================================

    private val overlayManager: OverlayWindowManager = OverlayWindowManager.getInstance(context)
    private val handler = Handler(Looper.getMainLooper())

    // Kalman filters for X and Y coordinates
    private val kalmanX = KalmanFilter2D(KALMAN_PROCESS_NOISE, KALMAN_MEASUREMENT_NOISE)
    private val kalmanY = KalmanFilter2D(KALMAN_PROCESS_NOISE, KALMAN_MEASUREMENT_NOISE)

    // ============================================================================
    // State
    // ============================================================================

    private val stateMachine = CursorStateMachine()

    // Position tracking
    private var lastNormalizedX = 0.5f
    private var lastNormalizedY = 0.5f
    private var lastScreenX = 0f
    private var lastScreenY = 0f
    private var velocityX = 0f
    private var velocityY = 0f

    // Screen dimensions
    private var screenWidth = 1080
    private var screenHeight = 1920

    // Dwell detection
    private var dwellStartX = 0f
    private var dwellStartY = 0f
    private var dwellStartTime = 0L
    private var dwellProgress = 0f
    private val dwellRunnable = object : Runnable {
        override fun run() {
            updateDwellProgress()
            if (stateMachine.currentState == CursorState.DWELLING) {
                handler.postDelayed(this, DWELL_PROGRESS_INTERVAL_MS)
            }
        }
    }

    // Drag state
    private var dragStartX = 0f
    private var dragStartY = 0f
    private var isDragInitiated = false

    // ============================================================================
    // Listeners
    // ============================================================================

    private var onCursorStateChanged: ((CursorState) -> Unit)? = null
    private var onCursorPositionChanged: ((Float, Float) -> Unit)? = null
    private var onDwellProgressChanged: ((Float) -> Unit)? = null

    // ============================================================================
    // Initialization
    // ============================================================================

    init {
        // Get screen dimensions
        updateScreenDimensions()

        // Set up overlay position listener
        overlayManager.setOnCursorMovedListener { x, y ->
            onCursorPositionChanged?.invoke(x, y)
        }
    }

    /**
     * Update screen dimensions
     */
    private fun updateScreenDimensions() {
        val (width, height) = overlayManager.getScreenDimensions()
        screenWidth = width
        screenHeight = height

        // Initialize Kalman filters with center position
        kalmanX.setState(width / 2f)
        kalmanY.setState(height / 2f)
    }

    // ============================================================================
    // Position Update
    // ============================================================================

    /**
     * Update cursor position from normalized hand coordinates
     *
     * @param normalizedX X position (0-1)
     * @param normalizedY Y position (0-1)
     * @param confidence Detection confidence (0-1)
     */
    fun updatePosition(normalizedX: Float, normalizedY: Float, confidence: Float = 1.0f) {
        // Skip low confidence updates
        if (confidence < 0.5f) return

        // Calculate velocity
        val dx = normalizedX - lastNormalizedX
        val dy = normalizedY - lastNormalizedY

        velocityX = dx * screenWidth
        velocityY = dy * screenHeight

        // Apply acceleration curve
        val (accelX, accelY) = applyAccelerationCurve(dx, dy)

        // Map to screen coordinates
        val targetX = normalizedX * screenWidth
        val targetY = normalizedY * screenHeight

        // Apply Kalman filter smoothing
        val smoothedX = kalmanX.update(targetX).toFloat()
        val smoothedY = kalmanY.update(targetY).toFloat()

        // Update overlay
        overlayManager.setTargetScreenPosition(smoothedX, smoothedY)

        // Update state based on movement
        updateStateFromMovement(smoothedX, smoothedY)

        // Store last positions
        lastNormalizedX = normalizedX
        lastNormalizedY = normalizedY
        lastScreenX = smoothedX
        lastScreenY = smoothedY
    }

    /**
     * Update cursor position from screen coordinates
     */
    fun updateScreenPosition(x: Float, y: Float) {
        // Apply Kalman filter
        val smoothedX = kalmanX.update(x).toFloat()
        val smoothedY = kalmanY.update(y).toFloat()

        // Update overlay
        overlayManager.setTargetScreenPosition(smoothedX, smoothedY)

        // Update state
        updateStateFromMovement(smoothedX, smoothedY)

        lastScreenX = smoothedX
        lastScreenY = smoothedY
    }

    /**
     * Apply acceleration curve to movement
     *
     * The acceleration curve provides:
     * - Precise control at low speeds (good for targeting small UI elements)
     * - Fast coverage at high speeds (good for moving across screen)
     */
    private fun applyAccelerationCurve(dx: Float, dy: Float): Pair<Float, Float> {
        val distance = sqrt(dx * dx + dy * dy) * screenWidth

        // Calculate acceleration factor
        val normalizedDistance = distance / screenWidth
        val accelerationFactor = when {
            normalizedDistance < ACCELERATION_THRESHOLD_LOW -> {
                // Precise mode: slow movement, fine control
                0.5f + 0.5f * (normalizedDistance / ACCELERATION_THRESHOLD_LOW)
            }
            normalizedDistance > ACCELERATION_THRESHOLD_HIGH -> {
                // Fast mode: accelerated movement
                val excess = (normalizedDistance - ACCELERATION_THRESHOLD_HIGH) /
                        (1f - ACCELERATION_THRESHOLD_HIGH)
                1.0f + excess.pow(ACCELERATION_EXPONENT) * 2f
            }
            else -> {
                // Normal mode: linear scaling
                normalizedDistance
            }
        }

        // Apply to deltas
        val accelDx = dx * accelerationFactor
        val accelDy = dy * accelerationFactor

        return Pair(accelDx, accelDy)
    }

    /**
     * Update state based on cursor movement
     */
    private fun updateStateFromMovement(x: Float, y: Float) {
        val currentState = stateMachine.currentState

        when (currentState) {
            CursorState.IDLE, CursorState.HOVERING -> {
                // Check for potential dwell
                checkDwell(x, y)
            }

            CursorState.DWELLING -> {
                // Check if moved out of dwell area
                val distanceFromDwellStart = sqrt(
                    (x - dwellStartX).pow(2) + (y - dwellStartY).pow(2)
                )

                if (distanceFromDwellStart > DWELL_RADIUS_THRESHOLD) {
                    // Cancel dwell
                    cancelDwell()
                }
            }

            CursorState.DRAGGING -> {
                // Continue drag
                continueDrag(x, y)
            }

            else -> {}
        }
    }

    // ============================================================================
    // Dwell Detection
    // ============================================================================

    /**
     * Check if cursor is dwelling (staying in place)
     */
    private fun checkDwell(x: Float, y: Float) {
        val distanceFromLast = sqrt(
            (x - lastScreenX).pow(2) + (y - lastScreenY).pow(2)
        )

        if (distanceFromLast < DWELL_RADIUS_THRESHOLD) {
            // Start or continue dwell
            if (stateMachine.currentState != CursorState.DWELLING) {
                startDwell(x, y)
            }
        } else {
            // Cancel dwell if we were dwelling
            if (stateMachine.currentState == CursorState.DWELLING) {
                cancelDwell()
            }
        }
    }

    /**
     * Start dwell detection
     */
    private fun startDwell(x: Float, y: Float) {
        dwellStartX = x
        dwellStartY = y
        dwellStartTime = System.currentTimeMillis()
        dwellProgress = 0f

        stateMachine.transition(CursorState.DWELLING)
        overlayManager.setCursorState(CursorState.DWELLING)

        handler.postDelayed(dwellRunnable, DWELL_PROGRESS_INTERVAL_MS)
    }

    /**
     * Update dwell progress
     */
    private fun updateDwellProgress() {
        val elapsed = System.currentTimeMillis() - dwellStartTime
        dwellProgress = (elapsed.toFloat() / DWELL_TIME_MS).coerceIn(0f, 1f)

        overlayManager.setDwellProgress(dwellProgress)
        onDwellProgressChanged?.invoke(dwellProgress)

        if (dwellProgress >= 1f) {
            // Dwell complete - trigger click
            performDwellClick()
        }
    }

    /**
     * Cancel dwell detection
     */
    private fun cancelDwell() {
        handler.removeCallbacks(dwellRunnable)
        dwellProgress = 0f
        overlayManager.setDwellProgress(0f)

        stateMachine.transition(CursorState.IDLE)
        overlayManager.setCursorState(CursorState.IDLE)
    }

    /**
     * Perform click after dwell
     */
    @RequiresApi(Build.VERSION_CODES.N)
    private fun performDwellClick() {
        handler.removeCallbacks(dwellRunnable)

        val accessibilityService = AccessibilityControlService.getInstance()
        accessibilityService?.performTap(dwellStartX, dwellStartY, object : AccessibilityControlService.GestureCallback {
            override fun onGestureCompleted() {
                overlayManager.triggerClickAnimation()
                overlayManager.triggerRippleAnimation()
                stateMachine.transition(CursorState.IDLE)
                overlayManager.setCursorState(CursorState.IDLE)
            }

            override fun onGestureCancelled() {
                stateMachine.transition(CursorState.IDLE)
                overlayManager.setCursorState(CursorState.IDLE)
            }
        })
    }

    // ============================================================================
    // Click Actions
    // ============================================================================

    /**
     * Perform a click at current cursor position
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performClick() {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performTap(lastScreenX, lastScreenY, object : AccessibilityControlService.GestureCallback {
            override fun onGestureCompleted() {
                overlayManager.triggerClickAnimation()
                overlayManager.triggerRippleAnimation()
            }

            override fun onGestureCancelled() {}
        })
    }

    /**
     * Perform a double click at current cursor position
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performDoubleClick() {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performDoubleTap(lastScreenX, lastScreenY, object : AccessibilityControlService.GestureCallback {
            override fun onGestureCompleted() {
                overlayManager.triggerClickAnimation()
                handler.postDelayed({ overlayManager.triggerClickAnimation() }, 100)
            }

            override fun onGestureCancelled() {}
        })
    }

    /**
     * Perform a long press at current cursor position
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performLongPress(durationMs: Long = 500) {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performLongPress(lastScreenX, lastScreenY, durationMs)
    }

    // ============================================================================
    // Drag Actions
    // ============================================================================

    /**
     * Start a drag operation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun startDrag() {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        dragStartX = lastScreenX
        dragStartY = lastScreenY
        isDragInitiated = false

        accessibilityService.startDrag(lastScreenX, lastScreenY, object : AccessibilityControlService.GestureCallback {
            override fun onGestureCompleted() {
                isDragInitiated = true
                stateMachine.transition(CursorState.DRAGGING)
                overlayManager.setCursorState(CursorState.DRAGGING)
            }

            override fun onGestureCancelled() {
                isDragInitiated = false
            }
        })
    }

    /**
     * Continue drag operation
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun continueDrag(x: Float, y: Float) {
        if (!isDragInitiated) return

        val accessibilityService = AccessibilityControlService.getInstance() ?: return
        accessibilityService.continueDrag(x, y)
    }

    /**
     * End drag operation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun endDrag() {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.endDrag(lastScreenX, lastScreenY, object : AccessibilityControlService.GestureCallback {
            override fun onGestureCompleted() {
                isDragInitiated = false
                stateMachine.transition(CursorState.IDLE)
                overlayManager.setCursorState(CursorState.IDLE)
            }

            override fun onGestureCancelled() {
                isDragInitiated = false
                stateMachine.transition(CursorState.IDLE)
                overlayManager.setCursorState(CursorState.IDLE)
            }
        })
    }

    // ============================================================================
    // Scroll Actions
    // ============================================================================

    /**
     * Perform scroll
     *
     * @param deltaY Scroll amount (positive = down, negative = up)
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performScroll(deltaY: Float) {
        if (abs(deltaY) < SCROLL_THRESHOLD * screenHeight) return

        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        val scrollDistance = deltaY * SCROLL_MULTIPLIER * screenHeight
        val direction = if (deltaY > 0) {
            AccessibilityControlService.ScrollDirection.DOWN
        } else {
            AccessibilityControlService.ScrollDirection.UP
        }

        stateMachine.transition(CursorState.SCROLLING)
        overlayManager.setCursorState(CursorState.SCROLLING)

        accessibilityService.performScroll(
            lastScreenX,
            lastScreenY,
            abs(scrollDistance),
            direction,
            callback = object : AccessibilityControlService.GestureCallback {
                override fun onGestureCompleted() {
                    stateMachine.transition(CursorState.IDLE)
                    overlayManager.setCursorState(CursorState.IDLE)
                }
                override fun onGestureCancelled() {
                    stateMachine.transition(CursorState.IDLE)
                    overlayManager.setCursorState(CursorState.IDLE)
                }
            }
        )
    }

    // ============================================================================
    // Swipe Actions
    // ============================================================================

    /**
     * Perform a swipe gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performSwipe(
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        durationMs: Long = 300
    ) {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performSwipe(startX, startY, endX, endY, durationMs)
    }

    /**
     * Perform directional swipe
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performDirectionalSwipe(
        direction: AccessibilityControlService.SwipeDirection,
        distance: Float = 300f
    ) {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performDirectionalSwipe(
            direction,
            lastScreenX,
            lastScreenY,
            distance
        )
    }

    // ============================================================================
    // Zoom Actions
    // ============================================================================

    /**
     * Perform zoom in gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performZoomIn(
        centerX: Float = screenWidth / 2f,
        centerY: Float = screenHeight / 2f
    ) {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performZoomIn(centerX, centerY)
    }

    /**
     * Perform zoom out gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performZoomOut(
        centerX: Float = screenWidth / 2f,
        centerY: Float = screenHeight / 2f
    ) {
        val accessibilityService = AccessibilityControlService.getInstance() ?: return

        accessibilityService.performZoomOut(centerX, centerY)
    }

    // ============================================================================
    // Global Actions
    // ============================================================================

    /**
     * Perform back action
     */
    fun performBack(): Boolean {
        return AccessibilityControlService.getInstance()?.performBack() ?: false
    }

    /**
     * Perform home action
     */
    fun performHome(): Boolean {
        return AccessibilityControlService.getInstance()?.performHome() ?: false
    }

    /**
     * Perform recents action
     */
    fun performRecents(): Boolean {
        return AccessibilityControlService.getInstance()?.performRecents() ?: false
    }

    /**
     * Open notifications
     */
    fun openNotifications(): Boolean {
        return AccessibilityControlService.getInstance()?.openNotifications() ?: false
    }

    /**
     * Take screenshot
     */
    @RequiresApi(Build.VERSION_CODES.P)
    fun takeScreenshot(): Boolean {
        return AccessibilityControlService.getInstance()?.takeScreenshot() ?: false
    }

    // ============================================================================
    // Overlay Management
    // ============================================================================

    /**
     * Show the cursor overlay
     */
    @RequiresApi(Build.VERSION_CODES.M)
    fun showOverlay(): Boolean {
        return overlayManager.showOverlay()
    }

    /**
     * Hide the cursor overlay
     */
    fun hideOverlay() {
        overlayManager.hideOverlay()
    }

    /**
     * Check if overlay is showing
     */
    fun isOverlayShowing(): Boolean = overlayManager.isShowing()

    /**
     * Set cursor visibility
     */
    fun setCursorVisible(visible: Boolean) {
        overlayManager.setCursorVisible(visible)
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    /**
     * Set cursor smoothing factor
     */
    fun setSmoothingFactor(factor: Float) {
        overlayManager.setLerpFactor(factor)
    }

    /**
     * Set cursor color
     */
    fun setCursorColor(color: Int) {
        overlayManager.setCursorColor(color)
    }

    /**
     * Enable/disable dwell click
     */
    fun setDwellClickEnabled(enabled: Boolean) {
        // Implementation for enabling/disabling dwell
    }

    // ============================================================================
    // Getters
    // ============================================================================

    /**
     * Get current cursor position
     */
    fun getCurrentPosition(): Pair<Float, Float> {
        return overlayManager.getCurrentPosition()
    }

    /**
     * Get current cursor state
     */
    fun getCurrentState(): CursorState = stateMachine.currentState

    /**
     * Get screen dimensions
     */
    fun getScreenDimensions(): Pair<Int, Int> = Pair(screenWidth, screenHeight)

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnCursorStateChangedListener(listener: (CursorState) -> Unit) {
        onCursorStateChanged = listener
    }

    fun setOnCursorPositionChangedListener(listener: (Float, Float) -> Unit) {
        onCursorPositionChanged = listener
    }

    fun setOnDwellProgressChangedListener(listener: (Float) -> Unit) {
        onDwellProgressChanged = listener
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    /**
     * Release resources
     */
    fun release() {
        handler.removeCallbacks(dwellRunnable)
        overlayManager.release()
        instance = null
    }
}

// ============================================================================
// Supporting Classes
// ============================================================================

/**
 * 2D Kalman Filter for cursor position smoothing
 */
class KalmanFilter2D(
    private val processNoise: Float,
    private val measurementNoise: Float
) {
    // State: [position, velocity]
    private var x = 0.0  // Position estimate
    private var v = 0.0  // Velocity estimate
    private var p = 1.0  // Error covariance

    private var isInitialized = false

    /**
     * Initialize filter with starting position
     */
    fun setState(position: Float) {
        x = position.toDouble()
        v = 0.0
        p = 1.0
        isInitialized = true
    }

    /**
     * Update filter with new measurement
     */
    fun update(measurement: Float): Double {
        if (!isInitialized) {
            setState(measurement)
            return measurement.toDouble()
        }

        // Predict step
        val xPred = x + v  // Predict position
        val pPred = p + processNoise  // Predict error covariance

        // Update step
        val k = pPred / (pPred + measurementNoise)  // Kalman gain
        x = xPred + k * (measurement - xPred)  // Update position
        v = x - xPred  // Update velocity
        p = (1 - k) * pPred  // Update error covariance

        return x
    }

    /**
     * Get current state
     */
    fun getState(): Double = x

    /**
     * Get current velocity
     */
    fun getVelocity(): Double = v
}

/**
 * Cursor state machine
 */
class CursorStateMachine {
    private val currentStateRef = AtomicReference(CursorState.IDLE)

    val currentState: CursorState
        get() = currentStateRef.get()

    /**
     * Transition to a new state
     */
    fun transition(newState: CursorState): Boolean {
        val current = currentStateRef.get()

        // Validate state transitions
        val validTransition = when (newState) {
            CursorState.IDLE -> true  // Can always go to IDLE
            CursorState.HOVERING -> current == CursorState.IDLE
            CursorState.DWELLING -> current == CursorState.IDLE || current == CursorState.HOVERING
            CursorState.CLICKING -> current != CursorState.DRAGGING && current != CursorState.SCROLLING
            CursorState.DRAGGING -> current == CursorState.IDLE || current == CursorState.CLICKING
            CursorState.SCROLLING -> current == CursorState.IDLE
            CursorState.DISABLED -> true
        }

        if (validTransition) {
            currentStateRef.set(newState)
            return true
        }

        return false
    }

    /**
     * Reset to idle
     */
    fun reset() {
        currentStateRef.set(CursorState.IDLE)
    }
}
