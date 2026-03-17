/**
 * IronGest - App-Specific Profiles System
 * Different gesture configurations per app
 *
 * Features:
 * - Auto-detect foreground app
 * - Switch gesture profiles automatically
 * - Custom sensitivity per app
 * - App-specific gesture mappings
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.profiles

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONObject
import java.util.UUID

/**
 * App-specific gesture configuration
 */
data class AppProfile(
    val id: String = UUID.randomUUID().toString(),
    val packageName: String,
    val appName: String,
    val enabled: Boolean = true,
    val gestureMappings: Map<String, String> = emptyMap(),
    val sensitivityMultiplier: Float = 1.0f,
    val cursorSpeedMultiplier: Float = 1.0f,
    val dwellTimeOverride: Long? = null,
    val hapticFeedbackEnabled: Boolean = true,
    val customCursorColor: String? = null,
    val enabledGestures: Set<String> = emptySet(),
    val disabledGestures: Set<String> = emptySet(),
    val priority: Int = 0
)

/**
 * Profile switching mode
 */
enum class ProfileSwitchMode {
    AUTO,           // Automatically switch based on foreground app
    MANUAL,         // User manually selects profile
    HYBRID          // Auto with manual override option
}

/**
 * Manager for app-specific profiles
 */
class AppProfileManager(private val context: Context) {

    companion object {
        private const val TAG = "AppProfileManager"
        private const val PREFS_NAME = "irongest_profiles"
        private const val PROFILES_KEY = "profiles"
        private const val DEFAULT_PROFILE_KEY = "default_profile"
        private const val SWITCH_MODE_KEY = "switch_mode"
        private const val POLLING_INTERVAL_MS = 1000L
    }

    // Stored profiles
    private val profiles = mutableMapOf<String, AppProfile>()

    // Current active profile
    private var currentProfile: AppProfile? = null
    private var currentPackageName: String? = null

    // Switch mode
    private var switchMode = ProfileSwitchMode.AUTO

    // Manual override
    private var manualOverrideProfile: String? = null

    // Listeners
    private var onProfileChanged: ((AppProfile) -> Unit)? = null

    // System services
    private val packageManager: PackageManager = context.packageManager
    private val activityManager: ActivityManager = 
        context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    private var usageStatsManager: UsageStatsManager? = null

    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        }
        loadProfiles()
        createDefaultProfile()
    }

    // ============================================================================
    // Profile Management
    // ============================================================================

    /**
     * Add or update a profile
     */
    fun setProfile(profile: AppProfile) {
        profiles[profile.packageName] = profile
        saveProfiles()
    }

    /**
     * Remove a profile
     */
    fun removeProfile(packageName: String) {
        profiles.remove(packageName)
        saveProfiles()
    }

    /**
     * Get profile for package
     */
    fun getProfile(packageName: String): AppProfile? {
        return profiles[packageName]
    }

    /**
     * Get all profiles
     */
    fun getAllProfiles(): List<AppProfile> {
        return profiles.values.toList().sortedByDescending { it.priority }
    }

    /**
     * Get current active profile
     */
    fun getCurrentProfile(): AppProfile? = currentProfile

    /**
     * Get installed apps with profiles
     */
    fun getInstalledApps(): List<AppInfo> {
        val installedApps = mutableListOf<AppInfo>()

        val intent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
            addCategory(android.content.Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfoList = packageManager.queryIntentActivities(intent, 0)

        for (resolveInfo in resolveInfoList) {
            val packageName = resolveInfo.activityInfo.packageName
            val appInfo = AppInfo(
                packageName = packageName,
                appName = resolveInfo.loadLabel(packageManager).toString(),
                icon = null, // Would load icon
                hasProfile = profiles.containsKey(packageName)
            )
            installedApps.add(appInfo)
        }

        return installedApps.sortedBy { it.appName.lowercase() }
    }

    // ============================================================================
    // Profile Switching
    // ============================================================================

    /**
     * Set profile switch mode
     */
    fun setSwitchMode(mode: ProfileSwitchMode) {
        switchMode = mode
        saveSwitchMode()
    }

    /**
     * Get current switch mode
     */
    fun getSwitchMode(): ProfileSwitchMode = switchMode

    /**
     * Manually override to a specific profile
     */
    fun setManualOverride(packageName: String?) {
        manualOverrideProfile = packageName
        applyProfile(packageName)
    }

    /**
     * Clear manual override
     */
    fun clearManualOverride() {
        manualOverrideProfile = null
        updateCurrentProfile()
    }

    /**
     * Update current profile based on foreground app
     */
    fun updateCurrentProfile() {
        // Don't auto-switch if manual override is active
        if (manualOverrideProfile != null && switchMode == ProfileSwitchMode.HYBRID) {
            return
        }

        if (switchMode == ProfileSwitchMode.MANUAL) {
            return
        }

        val foregroundPackage = getForegroundAppPackageName()

        if (foregroundPackage != currentPackageName) {
            currentPackageName = foregroundPackage
            applyProfile(foregroundPackage)
        }
    }

    /**
     * Apply a profile
     */
    private fun applyProfile(packageName: String?) {
        val profile = if (packageName != null) {
            profiles[packageName] ?: profiles["default"]
        } else {
            profiles["default"]
        }

        if (profile != currentProfile) {
            currentProfile = profile
            profile?.let { onProfileChanged?.invoke(it) }
        }
    }

    /**
     * Get foreground app package name
     */
    private fun getForegroundAppPackageName(): String? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            getForegroundAppPostLollipop()
        } else {
            getForegroundAppPreLollipop()
        }
    }

    @Suppress("DEPRECATION")
    private fun getForegroundAppPreLollipop(): String? {
        val runningTasks = activityManager.getRunningTasks(1)
        return runningTasks.firstOrNull()?.topActivity?.packageName
    }

    private fun getForegroundAppPostLollipop(): String? {
        val usageStatsManager = this.usageStatsManager ?: return null

        val endTime = System.currentTimeMillis()
        val startTime = endTime - POLLING_INTERVAL_MS * 2

        val usageStats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_BEST,
            startTime,
            endTime
        )

        return usageStats
            .maxByOrNull { it.lastTimeUsed }
            ?.packageName
    }

    // ============================================================================
    // Gesture Configuration
    // ============================================================================

    /**
     * Get effective gesture mapping for current profile
     */
    fun getEffectiveGestureMapping(gestureType: String): String {
        return currentProfile?.gestureMappings?.get(gestureType) ?: gestureType
    }

    /**
     * Check if gesture is enabled in current profile
     */
    fun isGestureEnabled(gestureType: String): Boolean {
        val profile = currentProfile ?: return true

        // Check disabled list first
        if (gestureType in profile.disabledGestures) {
            return false
        }

        // Check enabled list (if empty, all are enabled)
        if (profile.enabledGestures.isEmpty()) {
            return true
        }

        return gestureType in profile.enabledGestures
    }

    /**
     * Get effective sensitivity
     */
    fun getEffectiveSensitivity(baseSensitivity: Float): Float {
        return baseSensitivity * (currentProfile?.sensitivityMultiplier ?: 1.0f)
    }

    /**
     * Get effective cursor speed
     */
    fun getEffectiveCursorSpeed(baseSpeed: Float): Float {
        return baseSpeed * (currentProfile?.cursorSpeedMultiplier ?: 1.0f)
    }

    /**
     * Get effective dwell time
     */
    fun getEffectiveDwellTime(baseDwellTime: Long): Long {
        return currentProfile?.dwellTimeOverride ?: baseDwellTime
    }

    // ============================================================================
    // Default Profile
    // ============================================================================

    private fun createDefaultProfile() {
        if (!profiles.containsKey("default")) {
            val defaultProfile = AppProfile(
                packageName = "default",
                appName = "Default",
                enabled = true,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "TAP",
                    "BACK_GESTURE" to "BACK",
                    "RECENT_APPS" to "RECENTS",
                    "SWIPE_LEFT" to "SCROLL_UP",
                    "SWIPE_RIGHT" to "SCROLL_DOWN"
                )
            )
            profiles["default"] = defaultProfile
            saveProfiles()
        }
    }

    // ============================================================================
    // Pre-configured Profiles
    // ============================================================================

    /**
     * Create profile for specific app type
     */
    fun createPresetProfile(packageName: String, preset: ProfilePreset): AppProfile {
        val appName = try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            packageName
        }

        return when (preset) {
            ProfilePreset.BROWSER -> AppProfile(
                packageName = packageName,
                appName = appName,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "TAP",
                    "BACK_GESTURE" to "BACK",
                    "SWIPE_LEFT" to "SWIPE_LEFT",
                    "SWIPE_RIGHT" to "SWIPE_RIGHT",
                    "SCROLL_UP" to "SCROLL_UP",
                    "SCROLL_DOWN" to "SCROLL_DOWN",
                    "ZOOM_IN" to "ZOOM_IN",
                    "ZOOM_OUT" to "ZOOM_OUT"
                ),
                cursorSpeedMultiplier = 1.2f,
                enabledGestures = setOf(
                    "PINCH_CLICK", "BACK_GESTURE", "SWIPE_LEFT", "SWIPE_RIGHT",
                    "SCROLL_UP", "SCROLL_DOWN", "ZOOM_IN", "ZOOM_OUT"
                )
            )

            ProfilePreset.VIDEO_PLAYER -> AppProfile(
                packageName = packageName,
                appName = appName,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "PLAY_PAUSE",
                    "SWIPE_LEFT" to "SEEK_BACKWARD",
                    "SWIPE_RIGHT" to "SEEK_FORWARD",
                    "SCROLL_UP" to "VOLUME_UP",
                    "SCROLL_DOWN" to "VOLUME_DOWN",
                    "ZOOM_IN" to "FULLSCREEN",
                    "ZOOM_OUT" to "EXIT_FULLSCREEN"
                ),
                sensitivityMultiplier = 0.8f,
                dwellTimeOverride = 300L
            )

            ProfilePreset.READER -> AppProfile(
                packageName = packageName,
                appName = appName,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "TAP",
                    "SWIPE_LEFT" to "NEXT_PAGE",
                    "SWIPE_RIGHT" to "PREV_PAGE",
                    "SCROLL_UP" to "SCROLL_UP",
                    "SCROLL_DOWN" to "SCROLL_DOWN"
                ),
                cursorSpeedMultiplier = 0.7f,
                dwellTimeOverride = 600L
            )

            ProfilePreset.GAME -> AppProfile(
                packageName = packageName,
                appName = appName,
                sensitivityMultiplier = 1.5f,
                cursorSpeedMultiplier = 1.5f,
                hapticFeedbackEnabled = true,
                dwellTimeOverride = 200L
            )

            ProfilePreset.SOCIAL -> AppProfile(
                packageName = packageName,
                appName = appName,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "LIKE",
                    "SWIPE_UP" to "NEXT_POST",
                    "SWIPE_DOWN" to "PREV_POST",
                    "BACK_GESTURE" to "BACK"
                ),
                cursorSpeedMultiplier = 1.3f
            )

            ProfilePreset.MUSIC -> AppProfile(
                packageName = packageName,
                appName = appName,
                gestureMappings = mapOf(
                    "PINCH_CLICK" to "PLAY_PAUSE",
                    "SWIPE_LEFT" to "PREV_TRACK",
                    "SWIPE_RIGHT" to "NEXT_TRACK",
                    "SCROLL_UP" to "VOLUME_UP",
                    "SCROLL_DOWN" to "VOLUME_DOWN"
                ),
                sensitivityMultiplier = 0.9f
            )

            ProfilePreset.CUSTOM -> AppProfile(
                packageName = packageName,
                appName = appName
            )
        }
    }

    // ============================================================================
    // Persistence
    // ============================================================================

    private fun loadProfiles() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(PROFILES_KEY, "{}") ?: "{}"

        try {
            val jsonObj = JSONObject(json)
            jsonObj.keys().forEach { key ->
                val profileJson = jsonObj.getJSONObject(key)
                profiles[key] = parseProfile(profileJson)
            }
        } catch (e: Exception) {
            // Invalid JSON, start fresh
        }

        // Load switch mode
        switchMode = ProfileSwitchMode.valueOf(
            prefs.getString(SWITCH_MODE_KEY, ProfileSwitchMode.AUTO.name) ?: ProfileSwitchMode.AUTO.name
        )
    }

    private fun saveProfiles() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val jsonObj = JSONObject()

        profiles.forEach { (key, profile) ->
            jsonObj.put(key, profile.toJson())
        }

        prefs.edit().putString(PROFILES_KEY, jsonObj.toString()).apply()
    }

    private fun saveSwitchMode() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(SWITCH_MODE_KEY, switchMode.name).apply()
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnProfileChangedListener(listener: (AppProfile) -> Unit) {
        onProfileChanged = listener
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private fun parseProfile(json: JSONObject): AppProfile {
        // Parse JSON to AppProfile
        return AppProfile(
            packageName = json.getString("packageName"),
            appName = json.getString("appName"),
            enabled = json.optBoolean("enabled", true),
            sensitivityMultiplier = json.optDouble("sensitivityMultiplier", 1.0).toFloat(),
            cursorSpeedMultiplier = json.optDouble("cursorSpeedMultiplier", 1.0).toFloat()
            // Parse other fields...
        )
    }
}

// ============================================================================
// Data Classes
// ============================================================================

data class AppInfo(
    val packageName: String,
    val appName: String,
    val icon: Any?,
    val hasProfile: Boolean
)

enum class ProfilePreset {
    BROWSER,
    VIDEO_PLAYER,
    READER,
    GAME,
    SOCIAL,
    MUSIC,
    CUSTOM
}

// JSON Extension
fun AppProfile.toJson(): JSONObject {
    return JSONObject().apply {
        put("packageName", packageName)
        put("appName", appName)
        put("enabled", enabled)
        put("sensitivityMultiplier", sensitivityMultiplier)
        put("cursorSpeedMultiplier", cursorSpeedMultiplier)
        put("hapticFeedbackEnabled", hapticFeedbackEnabled)
        // Add other fields...
    }
}
