package com.irongest

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class IronGestApplication : Application() {

    companion object {
        const val CHANNEL_ID = "irongest_service"
        const val CHANNEL_NAME = "IronGest Service"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "IronGest foreground service notification"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}
