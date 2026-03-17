/**
 * IronGest - HUD Notifications System
 * Gesture to dismiss notifications in AR overlay
 *
 * Features:
 * - AR notification display
 * - Gesture-based dismissal
 * - Priority filtering
 * - Action shortcuts
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.notifications

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.UUID

/**
 * HUD notification type
 */
enum class HUDNotificationType {
    INFO,
    SUCCESS,
    WARNING,
    ERROR,
    SYSTEM
}

/**
 * HUD notification data
 */
data class HUDNotification(
    val id: String = UUID.randomUUID().toString(),
    val type: HUDNotificationType = HUDNotificationType.INFO,
    val title: String,
    val message: String,
    val packageName: String = "",
    val icon: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val priority: Int = Notification.PRIORITY_DEFAULT,
    val category: String = "",
    val actions: List<NotificationAction> = emptyList(),
    val dismissGesture: String = "SWIPE_LEFT",
    val duration: Long = 5000L,
    var isRead: Boolean = false,
    var isDismissed: Boolean = false
)

/**
 * Notification action
 */
data class NotificationAction(
    val id: String,
    val label: String,
    val gestureTrigger: String? = null,
    val actionIntent: String? = null
)

/**
 * Notification position on screen
 */
enum class NotificationPosition {
    TOP,
    TOP_LEFT,
    TOP_RIGHT,
    CENTER,
    BOTTOM,
    BOTTOM_LEFT,
    BOTTOM_RIGHT
}

/**
 * HUD notification configuration
 */
data class HUDNotificationConfig(
    val enabled: Boolean = true,
    val showSystemNotifications: Boolean = true,
    val showGestureHints: Boolean = true,
    val autoDismiss: Boolean = true,
    val defaultDuration: Long = 5000L,
    val maxVisible: Int = 5,
    val position: NotificationPosition = NotificationPosition.TOP,
    val animationDuration: Long = 300L,
    val excludedPackages: Set<String> = emptySet(),
    val minimumPriority: Int = Notification.PRIORITY_DEFAULT
)

/**
 * Manager for HUD notifications
 */
class HUDNotificationManager(private val context: Context) {

    companion object {
        private const val TAG = "HUDNotificationManager"
        private const val PREFS_NAME = "irongest_notifications"
        private const val CONFIG_KEY = "config"
    }

    // Configuration
    private var config = HUDNotificationConfig()

    // Active notifications
    private val activeNotifications = mutableListOf<HUDNotification>()

    // History
    private val notificationHistory = mutableListOf<HUDNotification>()
    private val maxHistorySize = 50

    // Listeners
    private var onNotificationReceived: ((HUDNotification) -> Unit)? = null
    private var onNotificationDismissed: ((String) -> Unit)? = null
    private var onNotificationAction: ((String, String) -> Unit)? = null
    private var onActiveNotificationsChanged: ((List<HUDNotification>) -> Unit)? = null

    // ============================================================================
    // Configuration
    // ============================================================================

    fun setConfig(newConfig: HUDNotificationConfig) {
        config = newConfig
        saveConfig()
    }

    fun getConfig(): HUDNotificationConfig = config

    // ============================================================================
    // Notification Management
    // ============================================================================

    /**
     * Add a notification to the HUD
     */
    fun showNotification(notification: HUDNotification): Boolean {
        if (!config.enabled) return false

        // Check excluded packages
        if (notification.packageName in config.excludedPackages) {
            return false
        }

        // Check priority
        if (notification.priority < config.minimumPriority) {
            return false
        }

        // Limit visible notifications
        while (activeNotifications.size >= config.maxVisible) {
            dismissOldest()
        }

        // Add to active list
        activeNotifications.add(notification)
        addToHistory(notification)

        // Notify listeners
        onNotificationReceived?.invoke(notification)
        onActiveNotificationsChanged?.invoke(activeNotifications.toList())

        // Auto-dismiss if enabled
        if (config.autoDismiss && notification.duration > 0) {
            scheduleDismiss(notification.id, notification.duration)
        }

        return true
    }

    /**
     * Dismiss a notification by ID
     */
    fun dismissNotification(notificationId: String): Boolean {
        val index = activeNotifications.indexOfFirst { it.id == notificationId }
        if (index < 0) return false

        val notification = activeNotifications.removeAt(index)
        notification.isDismissed = true

        onNotificationDismissed?.invoke(notificationId)
        onActiveNotificationsChanged?.invoke(activeNotifications.toList())

        return true
    }

    /**
     * Dismiss all notifications
     */
    fun dismissAll() {
        activeNotifications.forEach { it.isDismissed = true }
        activeNotifications.clear()

        onActiveNotificationsChanged?.invoke(emptyList())
    }

    /**
     * Get all active notifications
     */
    fun getActiveNotifications(): List<HUDNotification> = activeNotifications.toList()

    /**
     * Get notification by ID
     */
    fun getNotification(id: String): HUDNotification? {
        return activeNotifications.find { it.id == id }
    }

    /**
     * Get notification history
     */
    fun getHistory(): List<HUDNotification> = notificationHistory.toList()

    /**
     * Clear history
     */
    fun clearHistory() {
        notificationHistory.clear()
    }

    // ============================================================================
    // Gesture Handling
    // ============================================================================

    /**
     * Handle gesture on notification
     */
    fun handleGesture(notificationId: String, gestureType: String): Boolean {
        val notification = getNotification(notificationId) ?: return false

        when (gestureType) {
            "SWIPE_LEFT", "SWIPE_RIGHT", "SWIPE_UP" -> {
                // Dismiss notification
                dismissNotification(notificationId)
            }

            "PINCH_CLICK", "TAP" -> {
                // Mark as read and trigger primary action
                notification.isRead = true
                triggerPrimaryAction(notification)
            }

            "DOUBLE_TAP" -> {
                // Open notification
                openNotification(notification)
            }

            else -> {
                // Check for gesture-triggered actions
                val action = notification.actions.find { it.gestureTrigger == gestureType }
                if (action != null) {
                    triggerAction(notification, action)
                } else {
                    return false
                }
            }
        }

        return true
    }

    /**
     * Handle global gesture for all notifications
     */
    fun handleGlobalGesture(gestureType: String): Boolean {
        when (gestureType) {
            "SWIPE_DOWN" -> {
                // Dismiss all notifications
                dismissAll()
                return true
            }

            "PINCH_CLICK" -> {
                // Dismiss oldest
                dismissOldest()
                return true
            }

            "PEACE_SIGN" -> {
                // Mark all as read
                markAllAsRead()
                return true
            }
        }

        return false
    }

    // ============================================================================
    // Actions
    // ============================================================================

    private fun triggerPrimaryAction(notification: HUDNotification) {
        val primaryAction = notification.actions.firstOrNull()
        if (primaryAction != null) {
            triggerAction(notification, primaryAction)
        } else {
            openNotification(notification)
        }
    }

    private fun triggerAction(notification: HUDNotification, action: NotificationAction) {
        onNotificationAction?.invoke(notification.id, action.id)

        // Execute action intent if available
        if (action.actionIntent != null) {
            // Would use PendingIntent to execute
        }
    }

    private fun openNotification(notification: HUDNotification) {
        // Would launch the notification's content intent
    }

    private fun markAllAsRead() {
        activeNotifications.forEach { it.isRead = true }
        onActiveNotificationsChanged?.invoke(activeNotifications.toList())
    }

    private fun dismissOldest() {
        if (activeNotifications.isNotEmpty()) {
            dismissNotification(activeNotifications.first().id)
        }
    }

    private fun scheduleDismiss(notificationId: String, delayMs: Long) {
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            dismissNotification(notificationId)
        }, delayMs)
    }

    // ============================================================================
    // System Notification Handling
    // ============================================================================

    /**
     * Process system notification (called from NotificationListenerService)
     */
    fun processSystemNotification(sbn: StatusBarNotification) {
        if (!config.showSystemNotifications) return

        val notification = sbn.notification

        val hudNotification = HUDNotification(
            id = sbn.key,
            type = getNotificationType(notification),
            title = notification.extras.getString(Notification.EXTRA_TITLE, ""),
            message = notification.extras.getCharSequence(Notification.EXTRA_TEXT, "").toString(),
            packageName = sbn.packageName,
            priority = notification.priority,
            category = notification.category ?: "",
            timestamp = sbn.postTime,
            actions = extractActions(notification),
            duration = config.defaultDuration
        )

        showNotification(hudNotification)
    }

    /**
     * Remove system notification
     */
    fun removeSystemNotification(key: String) {
        dismissNotification(key)
    }

    private fun getNotificationType(notification: Notification): HUDNotificationType {
        return when {
            notification.priority >= Notification.PRIORITY_HIGH -> HUDNotificationType.WARNING
            notification.extras.getBoolean("is_error", false) -> HUDNotificationType.ERROR
            notification.extras.getBoolean("is_success", false) -> HUDNotificationType.SUCCESS
            else -> HUDNotificationType.INFO
        }
    }

    private fun extractActions(notification: Notification): List<NotificationAction> {
        val actions = mutableListOf<NotificationAction>()

        notification.actions?.forEachIndexed { index, action ->
            actions.add(NotificationAction(
                id = "action_$index",
                label = action.title.toString(),
                actionIntent = action.actionIntent?.intentSender?.toString()
            ))
        }

        return actions
    }

    // ============================================================================
    // Persistence
    // ============================================================================

    private fun addToHistory(notification: HUDNotification) {
        notificationHistory.add(0, notification)

        while (notificationHistory.size > maxHistorySize) {
            notificationHistory.removeAt(notificationHistory.size - 1)
        }
    }

    private fun saveConfig() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            putBoolean("enabled", config.enabled)
            putBoolean("showSystemNotifications", config.showSystemNotifications)
            putLong("defaultDuration", config.defaultDuration)
            putInt("maxVisible", config.maxVisible)
            putString("position", config.position.name)
            apply()
        }
    }

    private fun loadConfig() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        config = HUDNotificationConfig(
            enabled = prefs.getBoolean("enabled", true),
            showSystemNotifications = prefs.getBoolean("showSystemNotifications", true),
            defaultDuration = prefs.getLong("defaultDuration", 5000L),
            maxVisible = prefs.getInt("maxVisible", 5),
            position = NotificationPosition.valueOf(
                prefs.getString("position", NotificationPosition.TOP.name) ?: NotificationPosition.TOP.name
            )
        )
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnNotificationReceivedListener(listener: (HUDNotification) -> Unit) {
        onNotificationReceived = listener
    }

    fun setOnNotificationDismissedListener(listener: (String) -> Unit) {
        onNotificationDismissed = listener
    }

    fun setOnNotificationActionListener(listener: (String, String) -> Unit) {
        onNotificationAction = listener
    }

    fun setOnActiveNotificationsChangedListener(listener: (List<HUDNotification>) -> Unit) {
        onActiveNotificationsChanged = listener
    }
}

/**
 * Notification Listener Service (needs to be registered in manifest)
 */
class HUDNotificationListenerService : NotificationListenerService() {

    companion object {
        private var manager: HUDNotificationManager? = null

        fun setManager(mgr: HUDNotificationManager) {
            manager = mgr
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        manager?.processSystemNotification(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        manager?.removeSystemNotification(sbn.key)
    }
}
