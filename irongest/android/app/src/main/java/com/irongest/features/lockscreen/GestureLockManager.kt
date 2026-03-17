/**
 * IronGest - Gesture Lock Screen
 * Custom gesture pattern to unlock device
 *
 * Features:
 * - Gesture sequence lock
 * - Pattern lock
 * - Custom lock gestures
 * - Secure unlock mechanism
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.lockscreen

import android.content.Context
import android.os.Handler
import android.os.Looper
import java.util.UUID
import kotlin.math.abs

/**
 * Lock gesture type
 */
enum class LockGestureType {
    SEQUENCE,   // Sequence of specific gestures
    PATTERN,    // Pattern of positions
    CUSTOM      // Custom gesture
}

/**
 * Lock configuration
 */
data class GestureLockConfig(
    val enabled: Boolean = true,
    val gestureType: LockGestureType = LockGestureType.SEQUENCE,
    val gestureSequence: List<String> = emptyList(),
    val maxAttempts: Int = 5,
    val lockoutTimeMs: Long = 30000L,  // 30 seconds
    val vibrateOnError: Boolean = true,
    val showHint: Boolean = false,
    val autoLockTimeoutMs: Long = 5000L
)

/**
 * Lock state
 */
enum class LockState {
    LOCKED,
    UNLOCKING,
    UNLOCKED,
    LOCKED_OUT,
    SETTING_UP
}

/**
 * Manager for gesture lock screen
 */
class GestureLockManager(private val context: Context) {

    companion object {
        private const val TAG = "GestureLockManager"
        private const val PREFS_NAME = "irongest_lock"
        private const val LOCK_CONFIG_KEY = "lock_config"
        private const val FAILED_ATTEMPTS_KEY = "failed_attempts"
        private const val LOCKOUT_UNTIL_KEY = "lockout_until"
        private const val GESTURE_TOLERANCE = 0.15f
    }

    // Configuration
    private var config = GestureLockConfig()

    // State
    private var currentState = LockState.LOCKED
    private var failedAttempts = 0
    private var lockoutUntil = 0L
    private val handler = Handler(Looper.getMainLooper())

    // Current input
    private val currentInput = mutableListOf<String>()

    // Listeners
    private var onLockStateChanged: ((LockState) -> Unit)? = null
    private var onAttemptFailed: ((attemptsRemaining: Int) -> Unit)? = null
    private var onLockoutStarted: ((durationMs: Long) -> Unit)? = null
    private var onUnlockSuccess: (() -> Unit)? = null

    init {
        loadConfig()
        checkLockout()
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    /**
     * Set lock configuration
     */
    fun setConfig(newConfig: GestureLockConfig) {
        config = newConfig
        saveConfig()

        if (!config.enabled) {
            currentState = LockState.UNLOCKED
            onLockStateChanged?.invoke(currentState)
        }
    }

    /**
     * Get current configuration
     */
    fun getConfig(): GestureLockConfig = config

    /**
     * Setup a new lock gesture sequence
     */
    fun setupLockSequence(sequence: List<String>): Boolean {
        if (sequence.size < 3) return false  // Minimum 3 gestures

        config = config.copy(
            gestureType = LockGestureType.SEQUENCE,
            gestureSequence = sequence
        )
        saveConfig()
        return true
    }

    // ============================================================================
    // Lock/Unlock
    // ============================================================================

    /**
     * Get current lock state
     */
    fun getLockState(): LockState = currentState

    /**
     * Lock the device
     */
    fun lock() {
        currentState = LockState.LOCKED
        currentInput.clear()
        onLockStateChanged?.invoke(currentState)
    }

    /**
     * Input a gesture for unlock attempt
     */
    fun inputGesture(gestureType: String): Boolean {
        if (currentState == LockState.LOCKED_OUT) {
            checkLockout()
            return false
        }

        if (currentState != LockState.LOCKED) {
            return false
        }

        currentInput.add(gestureType)

        // Check if sequence matches
        if (currentInput.size == config.gestureSequence.size) {
            if (verifySequence()) {
                unlockSuccess()
                return true
            } else {
                unlockFailed()
                return false
            }
        }

        // Check partial match
        if (!isPartialMatch()) {
            unlockFailed()
            return false
        }

        return true
    }

    /**
     * Clear current input
     */
    fun clearInput() {
        currentInput.clear()
    }

    /**
     * Get current input sequence
     */
    fun getCurrentInput(): List<String> = currentInput.toList()

    /**
     * Get expected sequence length
     */
    fun getExpectedLength(): Int = config.gestureSequence.size

    // ============================================================================
    // Verification
    // ============================================================================

    private fun verifySequence(): Boolean {
        if (config.gestureType != LockGestureType.SEQUENCE) return false

        if (currentInput.size != config.gestureSequence.size) return false

        return currentInput.zip(config.gestureSequence).all { (input, expected) ->
            input == expected
        }
    }

    private fun isPartialMatch(): Boolean {
        if (currentInput.size > config.gestureSequence.size) return false

        for (i in currentInput.indices) {
            if (currentInput[i] != config.gestureSequence[i]) {
                return false
            }
        }

        return true
    }

    // ============================================================================
    // Success/Failure Handling
    // ============================================================================

    private fun unlockSuccess() {
        failedAttempts = 0
        currentInput.clear()
        currentState = LockState.UNLOCKED
        saveFailedAttempts()

        onUnlockSuccess?.invoke()
        onLockStateChanged?.invoke(currentState)

        // Auto-lock after timeout
        handler.postDelayed({
            if (currentState == LockState.UNLOCKED) {
                lock()
            }
        }, config.autoLockTimeoutMs)
    }

    private fun unlockFailed() {
        failedAttempts++
        currentInput.clear()
        saveFailedAttempts()

        val attemptsRemaining = config.maxAttempts - failedAttempts

        onAttemptFailed?.invoke(attemptsRemaining)

        if (failedAttempts >= config.maxAttempts) {
            startLockout()
        }
    }

    private fun startLockout() {
        currentState = LockState.LOCKED_OUT
        lockoutUntil = System.currentTimeMillis() + config.lockoutTimeMs
        saveLockoutTime()

        onLockoutStarted?.invoke(config.lockoutTimeMs)
        onLockStateChanged?.invoke(currentState)

        // Schedule lockout end check
        handler.postDelayed({
            checkLockout()
        }, config.lockoutTimeMs)
    }

    private fun checkLockout() {
        if (lockoutUntil > 0 && System.currentTimeMillis() >= lockoutUntil) {
            lockoutUntil = 0
            failedAttempts = 0
            currentState = LockState.LOCKED
            saveLockoutTime()
            saveFailedAttempts()
            onLockStateChanged?.invoke(currentState)
        }
    }

    /**
     * Check if currently locked out
     */
    fun isLockedOut(): Boolean {
        checkLockout()
        return currentState == LockState.LOCKED_OUT
    }

    /**
     * Get remaining lockout time
     */
    fun getRemainingLockoutTime(): Long {
        if (lockoutUntil == 0L) return 0
        return maxOf(0L, lockoutUntil - System.currentTimeMillis())
    }

    // ============================================================================
    // Persistence
    // ============================================================================

    private fun loadConfig() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        failedAttempts = prefs.getInt(FAILED_ATTEMPTS_KEY, 0)
        lockoutUntil = prefs.getLong(LOCKOUT_UNTIL_KEY, 0L)

        // Load gesture sequence
        val sequenceStr = prefs.getString("gesture_sequence", null)
        if (sequenceStr != null) {
            config = config.copy(
                gestureSequence = sequenceStr.split(",")
            )
        }
    }

    private fun saveConfig() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("gesture_sequence", config.gestureSequence.joinToString(","))
            putInt("max_attempts", config.maxAttempts)
            putLong("lockout_time", config.lockoutTimeMs)
            apply()
        }
    }

    private fun saveFailedAttempts() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putInt(FAILED_ATTEMPTS_KEY, failedAttempts).apply()
    }

    private fun saveLockoutTime() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putLong(LOCKOUT_UNTIL_KEY, lockoutUntil).apply()
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnLockStateChangedListener(listener: (LockState) -> Unit) {
        onLockStateChanged = listener
    }

    fun setOnAttemptFailedListener(listener: (Int) -> Unit) {
        onAttemptFailed = listener
    }

    fun setOnLockoutStartedListener(listener: (Long) -> Unit) {
        onLockoutStarted = listener
    }

    fun setOnUnlockSuccessListener(listener: () -> Unit) {
        onUnlockSuccess = listener
    }
}
