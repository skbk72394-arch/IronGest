/**
 * IronGest - Eye Tracking Combo
 * Gaze direction + hand gesture for precision control
 *
 * Features:
 * - Gaze tracking via camera
 * - Eye blink detection
 * - Gaze + gesture combos
 * - Dwell-to-select
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.eyetracking

import android.content.Context
import android.graphics.PointF
import org.json.JSONObject
import java.util.UUID

/**
 * Eye tracking configuration
 */
data class EyeTrackingConfig(
    val enabled: Boolean = true,
    val sensitivity: Float = 1.0f,
    val smoothFactor: Float = 0.3f,
    val blinkToSelect: Boolean = true,
    val dwellToSelect: Boolean = true,
    val dwellTimeMs: Long = 500L,
    val showGazeIndicator: Boolean = true,
    val gazeIndicatorSize: Float = 20f,
    val blinkThreshold: Float = 0.2f
)

/**
 * Gaze data
 */
data class GazeData(
    val x: Float,              // Normalized 0-1
    val y: Float,              // Normalized 0-1
    val leftEyeOpen: Boolean,
    val rightEyeOpen: Boolean,
    val confidence: Float,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Gaze region on screen
 */
enum class GazeRegion {
    CENTER,
    TOP,
    BOTTOM,
    LEFT,
    RIGHT,
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    UNKNOWN
}

/**
 * Eye + gesture combo action
 */
data class EyeGestureCombo(
    val id: String,
    val gazeRegion: GazeRegion,
    val gestureType: String,
    val action: String,
    val description: String = "",
    val enabled: Boolean = true
)

/**
 * Manager for eye tracking + gesture combo
 */
class EyeTrackingManager(private val context: Context) {

    companion object {
        private const val TAG = "EyeTrackingManager"
        private const val REGION_THRESHOLD = 0.3f
        private const val SMOOTHING_WINDOW = 5
    }

    // Configuration
    private var config = EyeTrackingConfig()

    // Current gaze state
    private var currentGaze: GazeData? = null
    private var smoothedGaze = PointF(0.5f, 0.5f)
    private val gazeHistory = ArrayDeque<GazeData>(SMOOTHING_WINDOW)

    // Blink detection
    private var lastBlinkTime = 0L
    private var blinkCount = 0
    private val minBlinkIntervalMs = 200L

    // Dwell detection
    private var dwellStartTime = 0L
    private var dwellPosition: PointF? = null
    private val dwellRadiusThreshold = 30f

    // Eye + gesture combos
    private val combos = mutableListOf<EyeGestureCombo>()

    // Pending gesture (waiting for gaze to complete combo)
    private var pendingGesture: String? = null
    private var pendingGestureTime = 0L
    private val comboTimeoutMs = 2000L

    // Listeners
    private var onGazeDetected: ((GazeData) -> Unit)? = null
    private var onBlinkDetected: (() -> Unit)? = null
    private var onRegionChanged: ((GazeRegion) -> Unit)? = null
    private var onComboTriggered: ((EyeGestureCombo) -> Unit)? = null
    private var onDwellComplete: ((PointF) -> Unit)? = null

    private var currentRegion = GazeRegion.CENTER

    init {
        loadDefaultCombos()
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    fun setConfig(newConfig: EyeTrackingConfig) {
        config = newConfig
    }

    fun getConfig(): EyeTrackingConfig = config

    // ============================================================================
    // Gaze Input
    // ============================================================================

    /**
     * Update gaze position from eye tracking source
     */
    fun updateGaze(x: Float, y: Float, leftEyeOpen: Boolean, rightEyeOpen: Boolean, confidence: Float) {
        if (!config.enabled) return

        val gaze = GazeData(
            x = x,
            y = y,
            leftEyeOpen = leftEyeOpen,
            rightEyeOpen = rightEyeOpen,
            confidence = confidence
        )

        // Add to history for smoothing
        gazeHistory.addLast(gaze)
        if (gazeHistory.size > SMOOTHING_WINDOW) {
            gazeHistory.removeFirst()
        }

        // Smooth gaze position
        smoothGaze()

        // Detect region change
        detectRegion()

        // Check for blinks
        detectBlink(gaze)

        // Check for dwell
        checkDwell()

        // Notify listeners
        onGazeDetected?.invoke(gaze)

        // Check pending combo
        checkPendingCombo()
    }

    /**
     * Smooth gaze position using moving average
     */
    private fun smoothGaze() {
        if (gazeHistory.isEmpty()) return

        var sumX = 0f
        var sumY = 0f
        gazeHistory.forEach { gaze ->
            sumX += gaze.x
            sumY += gaze.y
        }

        val avgX = sumX / gazeHistory.size
        val avgY = sumY / gazeHistory.size

        // Apply exponential smoothing
        smoothedGaze.x = smoothedGaze.x + (avgX - smoothedGaze.x) * config.smoothFactor
        smoothedGaze.y = smoothedGaze.y + (avgY - smoothedGaze.y) * config.smoothFactor

        currentGaze = gazeHistory.last()
    }

    /**
     * Get current smoothed gaze position
     */
    fun getGazePosition(): PointF = PointF(smoothedGaze.x, smoothedGaze.y)

    /**
     * Get current gaze data
     */
    fun getCurrentGaze(): GazeData? = currentGaze

    // ============================================================================
    // Region Detection
    // ============================================================================

    private fun detectRegion() {
        val newRegion = when {
            smoothedGaze.x < REGION_THRESHOLD && smoothedGaze.y < REGION_THRESHOLD -> GazeRegion.TOP_LEFT
            smoothedGaze.x > 1 - REGION_THRESHOLD && smoothedGaze.y < REGION_THRESHOLD -> GazeRegion.TOP_RIGHT
            smoothedGaze.x < REGION_THRESHOLD && smoothedGaze.y > 1 - REGION_THRESHOLD -> GazeRegion.BOTTOM_LEFT
            smoothedGaze.x > 1 - REGION_THRESHOLD && smoothedGaze.y > 1 - REGION_THRESHOLD -> GazeRegion.BOTTOM_RIGHT
            smoothedGaze.y < REGION_THRESHOLD -> GazeRegion.TOP
            smoothedGaze.y > 1 - REGION_THRESHOLD -> GazeRegion.BOTTOM
            smoothedGaze.x < REGION_THRESHOLD -> GazeRegion.LEFT
            smoothedGaze.x > 1 - REGION_THRESHOLD -> GazeRegion.RIGHT
            else -> GazeRegion.CENTER
        }

        if (newRegion != currentRegion) {
            currentRegion = newRegion
            onRegionChanged?.invoke(currentRegion)
        }
    }

    fun getCurrentRegion(): GazeRegion = currentRegion

    // ============================================================================
    // Blink Detection
    // ============================================================================

    private fun detectBlink(gaze: GazeData) {
        val bothEyesClosed = !gaze.leftEyeOpen && !gaze.rightEyeOpen

        if (bothEyesClosed) {
            val now = System.currentTimeMillis()
            if (now - lastBlinkTime > minBlinkIntervalMs) {
                blinkCount++
                lastBlinkTime = now

                // Single blink = select
                if (config.blinkToSelect) {
                    onBlinkDetected?.invoke()

                    // Trigger select at gaze position
                    if (pendingGesture != null) {
                        // This was a gesture + blink combo
                        checkPendingCombo()
                    }
                }
            }
        }
    }

    // ============================================================================
    // Dwell Detection
    // ============================================================================

    private fun checkDwell() {
        if (!config.dwellToSelect) return

        val currentPos = PointF(smoothedGaze.x, smoothedGaze.y)

        if (dwellPosition == null) {
            dwellPosition = currentPos
            dwellStartTime = System.currentTimeMillis()
            return
        }

        // Check if still dwelling in same area
        val distance = calculateDistance(currentPos, dwellPosition!!)

        if (distance < dwellRadiusThreshold) {
            val dwellDuration = System.currentTimeMillis() - dwellStartTime

            if (dwellDuration >= config.dwellTimeMs) {
                // Dwell complete
                onDwellComplete?.invoke(currentPos)
                dwellPosition = null
            }
        } else {
            // Reset dwell
            dwellPosition = currentPos
            dwellStartTime = System.currentTimeMillis()
        }
    }

    private fun calculateDistance(a: PointF, b: PointF): Float {
        return kotlin.math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
    }

    // ============================================================================
    // Gesture Combo
    // ============================================================================

    /**
     * Register a gesture for combo detection
     */
    fun registerGesture(gestureType: String) {
        pendingGesture = gestureType
        pendingGestureTime = System.currentTimeMillis()
        checkPendingCombo()
    }

    private fun checkPendingCombo() {
        val gesture = pendingGesture ?: return

        if (System.currentTimeMillis() - pendingGestureTime > comboTimeoutMs) {
            pendingGesture = null
            return
        }

        // Find matching combo
        val matchingCombo = combos.find { combo ->
            combo.enabled &&
            combo.gestureType == gesture &&
            combo.gazeRegion == currentRegion
        }

        if (matchingCombo != null) {
            onComboTriggered?.invoke(matchingCombo)
            pendingGesture = null
        }
    }

    // ============================================================================
    // Combo Management
    // ============================================================================

    fun addCombo(combo: EyeGestureCombo) {
        combos.add(combo)
    }

    fun removeCombo(id: String) {
        combos.removeAll { it.id == id }
    }

    fun getCombos(): List<EyeGestureCombo> = combos.toList()

    private fun loadDefaultCombos() {
        combos.addAll(listOf(
            EyeGestureCombo(
                id = "top_select",
                gazeRegion = GazeRegion.TOP,
                gestureType = "PINCH_CLICK",
                action = "STATUS_BAR",
                description = "Pull down status bar"
            ),
            EyeGestureCombo(
                id = "bottom_select",
                gazeRegion = GazeRegion.BOTTOM,
                gestureType = "PINCH_CLICK",
                action = "NAVIGATION_BAR",
                description = "Show navigation bar"
            ),
            EyeGestureCombo(
                id = "left_scroll",
                gazeRegion = GazeRegion.LEFT,
                gestureType = "SWIPE_RIGHT",
                action = "SCROLL_RIGHT",
                description = "Scroll right"
            ),
            EyeGestureCombo(
                id = "right_scroll",
                gazeRegion = GazeRegion.RIGHT,
                gestureType = "SWIPE_LEFT",
                action = "SCROLL_LEFT",
                description = "Scroll left"
            ),
            EyeGestureCombo(
                id = "center_select",
                gazeRegion = GazeRegion.CENTER,
                gestureType = "PINCH_CLICK",
                action = "SELECT",
                description = "Select at gaze position"
            )
        ))
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnGazeDetectedListener(listener: (GazeData) -> Unit) {
        onGazeDetected = listener
    }

    fun setOnBlinkDetectedListener(listener: () -> Unit) {
        onBlinkDetected = listener
    }

    fun setOnRegionChangedListener(listener: (GazeRegion) -> Unit) {
        onRegionChanged = listener
    }

    fun setOnComboTriggeredListener(listener: (EyeGestureCombo) -> Unit) {
        onComboTriggered = listener
    }

    fun setOnDwellCompleteListener(listener: (PointF) -> Unit) {
        onDwellComplete = listener
    }
}
