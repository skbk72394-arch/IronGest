/**
 * IronGest - Notification Listener Service
 * Handles notification control for gesture-based notification management
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.accessibility

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class AppNotificationListenerService : NotificationListenerService() {
    
    companion object {
        private const val TAG = "IronGest-Notification"
        
        @Volatile
        private var instance: AppNotificationListenerService? = null
        
        fun getInstance(): AppNotificationListenerService? = instance
        fun isServiceEnabled(): Boolean = instance != null
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "Notification listener connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.i(TAG, "Notification listener disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Handle new notification
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Handle notification removal
    }

    /**
     * Dismiss all notifications
     */
    fun dismissAll() {
        cancelAllNotifications()
    }

    /**
     * Dismiss a specific notification
     */
    fun dismissNotification(key: String) {
        cancelNotification(key)
    }
}
