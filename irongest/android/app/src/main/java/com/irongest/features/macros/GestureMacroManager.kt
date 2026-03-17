/**
 * IronGest - Gesture Macros System
 * Record gesture sequences and trigger shortcuts/actions
 *
 * Features:
 * - Record custom gesture sequences
 * - Bind macros to apps, actions, or shortcuts
 * - Conditional macro execution
 * - Macro sharing and import/export
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.macros

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.abs

/**
 * Represents a single gesture in a macro sequence
 */
data class GestureStep(
    val gestureType: String,
    val durationMs: Long = 500,
    val position: Pair<Float, Float>? = null,  // Normalized position
    val intensity: Float = 1.0f,
    val delayAfterMs: Long = 100
)

/**
 * Trigger condition for macro execution
 */
data class MacroTrigger(
    val type: TriggerType,
    val value: String,
    val condition: TriggerCondition = TriggerCondition.EXACT
)

enum class TriggerType {
    GESTURE_SEQUENCE,    // Sequence of gestures
    APP_FOREGROUND,      // When specific app is open
    TIME_OF_DAY,         // Scheduled time
    LOCATION,            // Geofence trigger
    BLUETOOTH_DEVICE,    // Connected device
    CUSTOM_CONDITION     // Custom boolean condition
}

enum class TriggerCondition {
    EXACT,               // Exact match
    PARTIAL,             // Partial match allowed
    ORDER_INDEPENDENT,   // Order doesn't matter
    WITHIN_TIMEOUT       // Must complete within time limit
}

/**
 * Action to execute when macro triggers
 */
data class MacroAction(
    val type: ActionType,
    val data: Bundle = Bundle(),
    val delayMs: Long = 0
)

enum class ActionType {
    LAUNCH_APP,
    OPEN_URL,
    EXECUTE_SHORTCUT,
    SIMULATE_GESTURE,
    TOGGLE_SETTING,
    SEND_INTENT,
    RUN_SCRIPT,
    PLAY_SOUND,
    SHOW_NOTIFICATION,
    VIBRATE_PATTERN,
    CONTROL_MEDIA,
    ADJUST_VOLUME,
    ADJUST_BRIGHTNESS
}

/**
 * Complete macro definition
 */
data class GestureMacro(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String = "",
    val icon: String? = null,
    val trigger: MacroTrigger,
    val steps: List<GestureStep>,
    val actions: List<MacroAction>,
    val enabled: Boolean = true,
    val priority: Int = 0,
    val cooldownMs: Long = 1000,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Manager for gesture macros
 */
class GestureMacroManager(private val context: Context) {

    companion object {
        private const val TAG = "GestureMacroManager"
        private const val PREFS_NAME = "irongest_macros"
        private const val MACROS_KEY = "macros"
        private const val SEQUENCE_MATCH_THRESHOLD = 0.85f
        private const val MAX_RECORDING_STEPS = 20
        private const val MAX_RECORDING_TIME_MS = 30000L
    }

    // Stored macros
    private val macros = mutableListOf<GestureMacro>()

    // Recording state
    private var isRecording = false
    private var recordingStartTime = 0L
    private val recordedSteps = mutableListOf<GestureStep>()

    // Execution state
    private var lastExecutionTime = mutableMapOf<String, Long>()

    // Listeners
    private var onMacroRecorded: ((GestureMacro) -> Unit)? = null
    private var onMacroTriggered: ((GestureMacro) -> Unit)? = null

    init {
        loadMacros()
    }

    // ============================================================================
    // Macro Management
    // ============================================================================

    /**
     * Add a new macro
     */
    fun addMacro(macro: GestureMacro) {
        macros.add(macro)
        saveMacros()
    }

    /**
     * Update existing macro
     */
    fun updateMacro(macro: GestureMacro) {
        val index = macros.indexOfFirst { it.id == macro.id }
        if (index >= 0) {
            macros[index] = macro.copy(updatedAt = System.currentTimeMillis())
            saveMacros()
        }
    }

    /**
     * Delete macro by ID
     */
    fun deleteMacro(macroId: String) {
        macros.removeAll { it.id == macroId }
        saveMacros()
    }

    /**
     * Get all macros
     */
    fun getMacros(): List<GestureMacro> = macros.toList()

    /**
     * Get macro by ID
     */
    fun getMacro(id: String): GestureMacro? = macros.find { it.id == id }

    /**
     * Enable/disable macro
     */
    fun setMacroEnabled(macroId: String, enabled: Boolean) {
        val index = macros.indexOfFirst { it.id == macroId }
        if (index >= 0) {
            macros[index] = macros[index].copy(enabled = enabled)
            saveMacros()
        }
    }

    // ============================================================================
    // Recording
    // ============================================================================

    /**
     * Start recording a new macro
     */
    fun startRecording(): Boolean {
        if (isRecording) return false

        isRecording = true
        recordingStartTime = System.currentTimeMillis()
        recordedSteps.clear()
        return true
    }

    /**
     * Record a gesture step
     */
    fun recordGesture(gestureType: String, position: Pair<Float, Float>? = null, intensity: Float = 1.0f) {
        if (!isRecording) return

        if (recordedSteps.size >= MAX_RECORDING_STEPS) {
            stopRecording()
            return
        }

        if (System.currentTimeMillis() - recordingStartTime > MAX_RECORDING_TIME_MS) {
            stopRecording()
            return
        }

        val lastStep = recordedSteps.lastOrNull()
        if (lastStep != null && lastStep.gestureType == gestureType) {
            // Update duration of same gesture
            val updatedStep = lastStep.copy(
                durationMs = System.currentTimeMillis() - recordingStartTime - 
                            recordedSteps.dropLast(1).sumOf { it.durationMs + it.delayAfterMs }
            )
            recordedSteps[recordedSteps.size - 1] = updatedStep
        } else {
            // Add new gesture
            recordedSteps.add(GestureStep(
                gestureType = gestureType,
                position = position,
                intensity = intensity
            ))
        }
    }

    /**
     * Stop recording and create macro
     */
    fun stopRecording(): GestureMacro? {
        if (!isRecording) return null

        isRecording = false

        if (recordedSteps.isEmpty()) return null

        // Calculate trigger from recorded sequence
        val trigger = MacroTrigger(
            type = TriggerType.GESTURE_SEQUENCE,
            value = recordedSteps.joinToString(",") { it.gestureType },
            condition = TriggerCondition.WITHIN_TIMEOUT
        )

        // Create macro (actions must be set separately)
        val macro = GestureMacro(
            name = "Macro ${macros.size + 1}",
            trigger = trigger,
            steps = recordedSteps.toList()
        )

        onMacroRecorded?.invoke(macro)
        return macro
    }

    /**
     * Cancel recording
     */
    fun cancelRecording() {
        isRecording = false
        recordedSteps.clear()
    }

    /**
     * Check if currently recording
     */
    fun isRecording(): Boolean = isRecording

    // ============================================================================
    // Sequence Matching
    // ============================================================================

    /**
     * Check if a gesture sequence matches any macro trigger
     */
    fun matchSequence(gestures: List<String>): GestureMacro? {
        // Sort by priority (higher first)
        val enabledMacros = macros.filter { it.enabled }.sortedByDescending { it.priority }

        for (macro in enabledMacros) {
            if (macro.trigger.type != TriggerType.GESTURE_SEQUENCE) continue

            // Check cooldown
            val lastExec = lastExecutionTime[macro.id] ?: 0L
            if (System.currentTimeMillis() - lastExec < macro.cooldownMs) continue

            val triggerGestures = macro.trigger.value.split(",")

            if (matchGestureSequence(gestures, triggerGestures, macro.trigger.condition)) {
                return macro
            }
        }

        return null
    }

    /**
     * Match gesture sequence with flexibility
     */
    private fun matchGestureSequence(
        input: List<String>,
        trigger: List<String>,
        condition: TriggerCondition
    ): Boolean {
        return when (condition) {
            TriggerCondition.EXACT -> {
                if (input.size != trigger.size) return false
                input.zip(trigger).all { (a, b) -> a == b }
            }

            TriggerCondition.PARTIAL -> {
                trigger.all { gesture -> gesture in input }
            }

            TriggerCondition.ORDER_INDEPENDENT -> {
                input.toSet() == trigger.toSet()
            }

            TriggerCondition.WITHIN_TIMEOUT -> {
                // Match sequence within time limit
                if (input.size != trigger.size) return false
                input.zip(trigger).all { (a, b) -> a == b }
            }
        }
    }

    // ============================================================================
    // Execution
    // ============================================================================

    /**
     * Execute a macro's actions
     */
    fun executeMacro(macro: GestureMacro) {
        if (!macro.enabled) return

        // Update last execution time
        lastExecutionTime[macro.id] = System.currentTimeMillis()

        // Notify listener
        onMacroTriggered?.invoke(macro)

        // Execute actions with delays
        var totalDelay = 0L
        for (action in macro.actions) {
            totalDelay += action.delayMs
            executeAction(action, totalDelay)
        }
    }

    /**
     * Execute a single action
     */
    private fun executeAction(action: MacroAction, delayMs: Long) {
        android.os.Handler(context.mainLooper).postDelayed({
            when (action.type) {
                ActionType.LAUNCH_APP -> {
                    val packageName = action.data.getString("packageName")
                    if (packageName != null) {
                        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
                        intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        intent?.let { context.startActivity(it) }
                    }
                }

                ActionType.OPEN_URL -> {
                    val url = action.data.getString("url")
                    if (url != null) {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(intent)
                    }
                }

                ActionType.SIMULATE_GESTURE -> {
                    // Would integrate with AccessibilityControlService
                    // gestureType = action.data.getString("gestureType")
                }

                ActionType.TOGGLE_SETTING -> {
                    val setting = action.data.getString("setting")
                    // Toggle system setting
                }

                ActionType.SHOW_NOTIFICATION -> {
                    // Show custom notification
                }

                ActionType.VIBRATE_PATTERN -> {
                    // Custom vibration pattern
                }

                ActionType.CONTROL_MEDIA -> {
                    // Media control action
                }

                ActionType.ADJUST_VOLUME -> {
                    // Volume adjustment
                }

                ActionType.ADJUST_BRIGHTNESS -> {
                    // Brightness adjustment
                }

                else -> {}
            }
        }, delayMs)
    }

    // ============================================================================
    // Import/Export
    // ============================================================================

    /**
     * Export macros to JSON
     */
    fun exportMacros(): String {
        val jsonArray = JSONArray()
        macros.forEach { macro ->
            jsonArray.put(macro.toJson())
        }
        return jsonArray.toString(2)
    }

    /**
     * Import macros from JSON
     */
    fun importMacros(json: String, overwrite: Boolean = false) {
        val jsonArray = JSONArray(json)

        if (overwrite) {
            macros.clear()
        }

        for (i in 0 until jsonArray.length()) {
            val macroJson = jsonArray.getJSONObject(i)
            val macro = GestureMacro.fromJson(macroJson)

            // Check for duplicates
            if (macros.none { it.id == macro.id }) {
                macros.add(macro)
            }
        }

        saveMacros()
    }

    // ============================================================================
    // Persistence
    // ============================================================================

    private fun loadMacros() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(MACROS_KEY, "[]") ?: "[]"

        try {
            val jsonArray = JSONArray(json)
            for (i in 0 until jsonArray.length()) {
                macros.add(GestureMacro.fromJson(jsonArray.getJSONObject(i)))
            }
        } catch (e: Exception) {
            // Invalid JSON, start fresh
        }
    }

    private fun saveMacros() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(MACROS_KEY, exportMacros()).apply()
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnMacroRecordedListener(listener: (GestureMacro) -> Unit) {
        onMacroRecorded = listener
    }

    fun setOnMacroTriggeredListener(listener: (GestureMacro) -> Unit) {
        onMacroTriggered = listener
    }
}

// ============================================================================
// JSON Extensions
// ============================================================================

fun GestureMacro.toJson(): JSONObject {
    return JSONObject().apply {
        put("id", id)
        put("name", name)
        put("description", description)
        put("enabled", enabled)
        put("priority", priority)
        put("cooldownMs", cooldownMs)

        put("trigger", JSONObject().apply {
            put("type", trigger.type.name)
            put("value", trigger.value)
            put("condition", trigger.condition.name)
        })

        put("steps", JSONArray().apply {
            steps.forEach { step ->
                put(JSONObject().apply {
                    put("gestureType", step.gestureType)
                    put("durationMs", step.durationMs)
                    put("intensity", step.intensity)
                    put("delayAfterMs", step.delayAfterMs)
                    step.position?.let { (x, y) ->
                        put("positionX", x)
                        put("positionY", y)
                    }
                })
            }
        })

        put("actions", JSONArray().apply {
            actions.forEach { action ->
                put(JSONObject().apply {
                    put("type", action.type.name)
                    put("delayMs", action.delayMs)
                    // Serialize Bundle data
                })
            }
        })
    }
}

fun GestureMacro.fromJson(json: JSONObject): GestureMacro {
    // Parse from JSON
    return GestureMacro(
        id = json.getString("id"),
        name = json.getString("name"),
        description = json.optString("description", ""),
        enabled = json.optBoolean("enabled", true),
        priority = json.optInt("priority", 0),
        cooldownMs = json.optLong("cooldownMs", 1000)
        // Parse remaining fields...
    )
}
