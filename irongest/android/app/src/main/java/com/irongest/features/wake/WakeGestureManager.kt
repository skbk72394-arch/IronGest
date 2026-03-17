/**
 * IronGest - Wake Gesture Detection
 * Specific gesture to activate phone without touching
 *
 * Features:
 * - Wake screen with gesture
 * - Low-power standby mode
 * - Configurable wake gesture
 * - Prevent accidental wake
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.wake

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.PowerManager
import android.view.WindowManager
import com.irongest.gestures.GestureRecognizer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Wake gesture configuration
 */
data class WakeGestureConfig(
    val enabled: Boolean = true,
    val gestureType: WakeGestureType = WakeGestureType.WAVE,
    val sensitivity: Float = 0.7f,
    val proximityRequired: Boolean = true,
    val doubleGestureRequired: Boolean = false,
    val timeWindowMs: Long = 2000L,
    val screenTimeoutAfterWakeMs: Long = 30000L,
    val vibrationFeedback: Boolean = true
)

/**
 * Types of wake gestures
 */
enum class WakeGestureType {
    WAVE,           // Wave hand across screen
    TAP,            // Air tap
    PEAK,           // Look at phone (proximity + orientation)
    FIST,           // Make a fist
    PEACE,          // Peace sign
    CUSTOM          // Custom gesture
}

/**
 * Wake gesture detection state
 */
enum class WakeState {
    STANDBY,        // Screen off, low power
    DETECTING,      // Potential wake detected
    CONFIRMED,      // Wake gesture confirmed
    AWAKE,          // Screen on, normal operation
    SLEEPING        // Transitioning to standby
}

/**
 * Manager for wake gesture detection
 */
class WakeGestureManager(private val context: Context) : SensorEventListener {

    companion object {
        private const val TAG = "WakeGestureManager"
        private const val PROXIMITY_THRESHOLD = 5.0f  // cm
        private const val WAVE_VELOCITY_THRESHOLD = 0.5f
        private const val MIN_WAKE_INTERVAL_MS = 3000L
    }

    // Configuration
    private var config = WakeGestureConfig()

    // State
    private var currentState = WakeState.STANDBY
    private val isMonitoring = AtomicBoolean(false)
    private var lastWakeTime = 0L

    // Sensors
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    // Power management
    private val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var wakeLock: PowerManager.WakeLock? = null

    // Gesture detection
    private var gestureRecognizer: GestureRecognizer? = null

    // Detection tracking
    private var proximityValue = Float.MAX_VALUE
    private var lastAccelerometerValues = FloatArray(3)
    private var gestureDetectionCount = 0
    private var firstGestureTime = 0L

    // Listeners
    private var onWakeGestureDetected: (() -> Unit)? = null
    private var onStateChanged: ((WakeState) -> Unit)? = null

    // ============================================================================
    // Lifecycle
    // ============================================================================

    /**
     * Start wake gesture monitoring
     */
    fun startMonitoring() {
        if (!config.enabled || isMonitoring.getAndSet(true)) return

        // Register sensors
        proximitySensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }

        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }

        currentState = WakeState.STANDBY
        onStateChanged?.invoke(currentState)
    }

    /**
     * Stop wake gesture monitoring
     */
    fun stopMonitoring() {
        if (!isMonitoring.getAndSet(false)) return

        sensorManager.unregisterListener(this)
        releaseWakeLock()
    }

    // ============================================================================
    // Sensor Events
    // ============================================================================

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_PROXIMITY -> {
                proximityValue = event.values[0]
                checkWakeCondition()
            }

            Sensor.TYPE_ACCELEROMETER -> {
                lastAccelerometerValues = event.values.clone()
                checkMotionPattern()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed
    }

    // ============================================================================
    // Wake Detection
    // ============================================================================

    private fun checkWakeCondition() {
        if (!isMonitoring.get()) return
        if (powerManager.isInteractive) {
            // Screen already on
            if (currentState != WakeState.AWAKE) {
                currentState = WakeState.AWAKE
                onStateChanged?.invoke(currentState)
            }
            return
        }

        // Check proximity
        val isNear = proximityValue < PROXIMITY_THRESHOLD

        when (config.gestureType) {
            WakeGestureType.PEAK -> {
                // Phone is picked up and looked at
                if (isNear && checkOrientationForViewing()) {
                    triggerWake()
                }
            }

            WakeGestureType.WAVE -> {
                // Wave detection is in checkMotionPattern
            }

            else -> {
                // Use gesture recognition
            }
        }
    }

    private fun checkMotionPattern() {
        if (!isMonitoring.get() || powerManager.isInteractive) return

        // Calculate motion velocity
        val magnitude = kotlin.math.sqrt(
            lastAccelerometerValues[0] * lastAccelerometerValues[0] +
            lastAccelerometerValues[1] * lastAccelerometerValues[1] +
            lastAccelerometerValues[2] * lastAccelerometerValues[2]
        )

        // Check for wave pattern
        if (config.gestureType == WakeGestureType.WAVE) {
            // Detect significant motion
            val deviation = kotlin.math.abs(magnitude - SensorManager.GRAVITY_EARTH)
            if (deviation > WAVE_VELOCITY_THRESHOLD * config.sensitivity) {
                if (currentState == WakeState.STANDBY) {
                    currentState = WakeState.DETECTING
                    onStateChanged?.invoke(currentState)
                }
                checkWakeGestureSequence()
            }
        }
    }

    private fun checkWakeGestureSequence() {
        val now = System.currentTimeMillis()

        // Prevent too frequent wakes
        if (now - lastWakeTime < MIN_WAKE_INTERVAL_MS) {
            return
        }

        // Track gesture sequence
        if (gestureDetectionCount == 0) {
            firstGestureTime = now
        }

        gestureDetectionCount++

        // Check for double gesture requirement
        if (config.doubleGestureRequired) {
            if (gestureDetectionCount >= 2) {
                if (now - firstGestureTime <= config.timeWindowMs) {
                    triggerWake()
                } else {
                    // Reset count, too slow
                    gestureDetectionCount = 1
                    firstGestureTime = now
                }
            }
        } else {
            // Single gesture wake
            triggerWake()
        }
    }

    private fun checkOrientationForViewing(): Boolean {
        // Check if phone is in portrait orientation at viewing angle
        val z = lastAccelerometerValues[2]
        return z > SensorManager.GRAVITY_EARTH * 0.5f
    }

    // ============================================================================
    // Wake Action
    // ============================================================================

    private fun triggerWake() {
        val now = System.currentTimeMillis()

        // Update state
        currentState = WakeState.CONFIRMED
        onStateChanged?.invoke(currentState)

        // Acquire wake lock
        acquireWakeLock()

        // Wake screen
        wakeScreen()

        // Update tracking
        lastWakeTime = now
        gestureDetectionCount = 0

        // Notify listener
        onWakeGestureDetected?.invoke()

        // Set state to awake
        currentState = WakeState.AWAKE
        onStateChanged?.invoke(currentState)

        // Schedule auto-sleep
        scheduleSleep()
    }

    private fun acquireWakeLock() {
        releaseWakeLock()

        wakeLock = powerManager.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "IronGest::WakeGesture"
        )

        wakeLock?.acquire(config.screenTimeoutAfterWakeMs)
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }

    private fun wakeScreen() {
        // Turn screen on
        val params = windowManager.defaultDisplay
        // Screen will be turned on by wake lock
    }

    private fun scheduleSleep() {
        // After screen timeout, transition back to standby
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (!powerManager.isInteractive) {
                currentState = WakeState.SLEEPING
                onStateChanged?.invoke(currentState)

                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    currentState = WakeState.STANDBY
                    onStateChanged?.invoke(currentState)
                }, 500)
            }
        }, config.screenTimeoutAfterWakeMs)
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    fun setConfig(newConfig: WakeGestureConfig) {
        config = newConfig

        if (config.enabled && !isMonitoring.get()) {
            startMonitoring()
        } else if (!config.enabled && isMonitoring.get()) {
            stopMonitoring()
        }
    }

    fun getConfig(): WakeGestureConfig = config

    fun getCurrentState(): WakeState = currentState

    fun isMonitoring(): Boolean = isMonitoring.get()

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnWakeGestureDetectedListener(listener: () -> Unit) {
        onWakeGestureDetected = listener
    }

    fun setOnStateChangedListener(listener: (WakeState) -> Unit) {
        onStateChanged = listener
    }
}
