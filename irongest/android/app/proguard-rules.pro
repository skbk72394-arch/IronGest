# IronGest - ProGuard Rules
# Production ProGuard configuration for release builds

# ============================================================================
# General Configuration
# ============================================================================

# Don't warn about unused classes or members
-dontwarn

# Keep debugging info
-keepattributes *Annotation*,Signature,EnclosingMethod
-keepdirectories

# ============================================================================
# React Native
# ============================================================================

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep React Native TurboModule interfaces
-keep interface com.facebook.react.turboModule.** { *; }
-keep class com.facebook.react.turboModule.** { *; }

# ============================================================================
# IronGest Native Modules
# ============================================================================

# Keep all IronGest native classes
-keep class com.irongest.** { *; }
-keep interface com.irongest.** { *; }
-keep enum com.irongest.**

# JNI methods
-keepclassmembers class com.irongest.** {
    native <methods>;
}

# ============================================================================
# MediaPipe
# ============================================================================

# Keep MediaPipe classes
-keep class com.google.mediapipe.** { *; }
-keep class com.google.mediapipe.formats.** { *; }
-keep class com.google.mediapipe.framework.** { *; }
-keep class com.google.mediapipe.java.** { *; }
-keep class com.google.mediapipe.modules.** { *; }

# ============================================================================
# Android Components
# ============================================================================

# Keep Android components
-keep class androidx.** { *; }
-keep class android.view.** { *; }
-keep class android.accessibilityservice.** { *; }
-keep class android.view.accessibility.** { *; }

# Accessibility Service
-keep class * extends android.accessibilityservice.AccessibilityService { *; }

# ============================================================================
# Kotlin
# ============================================================================

# Kotlin metadata
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$When {
    *;
}

# Coroutines
-keep class kotlinx.coroutines.** { *; }

# ============================================================================
# Camera
# ============================================================================

# CameraX
-keep class androidx.camera.** { *; }

# ============================================================================
# Animation Libraries
# ============================================================================

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.animated.** { *; }

# ============================================================================
# JavaScript Bridge
# ============================================================================

# Keep JavaScript interface methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactProp *;
}

# ============================================================================
# Parcelable & Serializable
# ============================================================================

# Keep Parcelable implementations
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
}

# ============================================================================
# Enumerations
# ============================================================================

# Keep all enums
-keepclassmembers enum * {
    public static **[] values();
    public * valueOf(java.lang.String);
}

# ============================================================================
# Logging
# ============================================================================

# Remove logging statements in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
