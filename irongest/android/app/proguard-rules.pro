# IronGest ProGuard Rules

# Keep all IronGest classes
-keep class com.irongest.** { *; }
-keep interface com.irongest.** { *; }
-keep enum com.irongest.**

# Keep MediaPipe classes
-keep class com.google.mediapipe.** { *; }

# Keep AndroidX
-keep class androidx.** { *; }

# Keep Kotlin
-keep class kotlin.** { *; }
-keepclassmembers class **$When { *; }
