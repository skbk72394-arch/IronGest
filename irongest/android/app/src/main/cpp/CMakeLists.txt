# IronGest - Main CMakeLists.txt
# Production-grade CMake configuration for native modules
# 
# Components:
# - Hand tracking (MediaPipe Hands)
# - Gesture classification
# - Kalman filtering
# - JNI bridge to React Native

cmake_minimum_required(VERSION 3.22.1)
project(irongest_native VERSION 1.0.0 LANGUAGES CXX)

# ============================================================================
# Build Configuration
# ============================================================================

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable position independent code for shared library
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Optimization flags
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -ffast-math -funroll-loops")
set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g -DDEBUG")

# ============================================================================
# Android Configuration
# ============================================================================

if(ANDROID)
    # Android NDK configuration
    set(ANDROID_NDK_VERSION "25.2.9519653")
    set(ANDROID_STL "c++_shared")
    
    # Enable NEON for ARM architectures
    if(ANDROID_ABI STREQUAL "arm64-v8a")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -mfpu=neon -ftree-vectorize")
    endif()
endif()

# ============================================================================
# Dependencies
# ============================================================================

# Find required packages
find_package(OpenCV REQUIRED)
find_package(Threads REQUIRED)

# ============================================================================
# MediaPipe Configuration
# ============================================================================

# MediaPipe is typically included as a prebuilt AAR, so we define the headers manually
set(MEDIAPIPE_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/mediapipe/include)

# ============================================================================
# Source Files
# ============================================================================

# Hand tracking sources
set(HAND_TRACKING_SOURCES
    hand_tracking/MediaPipeBridge.cpp
    hand_tracking/HandLandmarks.cpp
    hand_tracking/jni/HandTrackingJni.cpp
)

# Gesture recognition sources
set(GESTURE_SOURCES
    gestures/GestureClassifier.cpp
    gestures/KalmanFilter.cpp
    gestures/GestureRecognizer.cpp
    gestures/jni/GestureRecognizerJni.cpp
)

# Cursor control sources
set(CURSOR_SOURCES
    cursor/CursorController.cpp
    cursor/jni/CursorJni.cpp
)

# Keyboard sources
set(KEYBOARD_SOURCES
    keyboard/KeyboardController.cpp
    keyboard/jni/KeyboardJni.cpp
)

# JNI bridge sources
set(JNI_BRIDGE_SOURCES
    jni/JniBridge.cpp
    jni/JniUtils.cpp
)

# All sources
set(ALL_SOURCES
    ${HAND_TRACKING_SOURCES}
    ${GESTURE_SOURCES}
    ${CURSOR_SOURCES}
    ${KEYBOARD_SOURCES}
    ${JNI_BRIDGE_SOURCES}
)

# ============================================================================
# Header Files
# ============================================================================

set(ALL_HEADERS
    hand_tracking/MediaPipeBridge.h
    hand_tracking/HandLandmarks.h
    gestures/GestureTypes.h
    gestures/GestureClassifier.h
    gestures/KalmanFilter.h
    gestures/GestureRecognizer.h
    cursor/CursorController.h
    keyboard/KeyboardController.h
    jni/JniBridge.h
    jni/JniUtils.h
)

# ============================================================================
# Libraries
# ============================================================================

# Main IronGest native library
add_library(irongest_jni SHARED ${ALL_SOURCES})

# Gesture classifier library (separate for modularity)
add_library(gesture_classifier STATIC
    gestures/GestureClassifier.cpp
    gestures/KalmanFilter.cpp
)

# Hand tracking library
add_library(hand_tracking STATIC
    hand_tracking/MediaPipeBridge.cpp
    hand_tracking/HandLandmarks.cpp
)

# ============================================================================
# Include Directories
# ============================================================================

target_include_directories(irongest_jni PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/hand_tracking
    ${CMAKE_CURRENT_SOURCE_DIR}/gestures
    ${CMAKE_CURRENT_SOURCE_DIR}/cursor
    ${CMAKE_CURRENT_SOURCE_DIR}/keyboard
    ${CMAKE_CURRENT_SOURCE_DIR}/jni
    ${MEDIAPIPE_INCLUDE_DIR}
)

target_include_directories(gesture_classifier PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/gestures
)

target_include_directories(hand_tracking PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/hand_tracking
    ${MEDIAPIPE_INCLUDE_DIR}
)

# ============================================================================
# Link Libraries
# ============================================================================

# Link dependencies for main library
target_link_libraries(irongest_jni
    gesture_classifier
    hand_tracking
    ${OpenCV_LIBS}
    Threads::Threads
    log
    android
    jnigraphics
)

# ============================================================================
# Compile Definitions
# ============================================================================

target_compile_definitions(irongest_jni PRIVATE
    $<$<CONFIG:DEBUG>:DEBUG=1>
    $<$<CONFIG:RELEASE>:NDEBUG=1>
    ANDROID_BUILD=1
    MEDIAPIPE_ENABLED=1
    OPENCV_ENABLED=1
)

# ============================================================================
# Output Configuration
# ============================================================================

# Set output directory
set_target_properties(irongest_jni PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}"
    OUTPUT_NAME "irongest_jni"
)

# ============================================================================
# Subdirectories
# ============================================================================

# Include subdirectory CMakeLists if they exist
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/hand_tracking/CMakeLists.txt")
    add_subdirectory(hand_tracking)
endif()

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/gestures/CMakeLists.txt")
    add_subdirectory(gestures)
endif()

# ============================================================================
# MediaPipe Integration
# ============================================================================

# Note: MediaPipe is typically bundled as a prebuilt library
# If using MediaPipe AAR, the native library is extracted automatically
# This section handles the case where we link against prebuilt MediaPipe

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libmediapipe_jni.so")
    add_library(mediapipe_jni SHARED IMPORTED)
    set_target_properties(mediapipe_jni PROPERTIES
        IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libmediapipe_jni.so"
    )
    target_link_libraries(irongest_jni mediapipe_jni)
endif()

# ============================================================================
# OpenCV Integration
# ============================================================================

# OpenCV is included via prefab in build.gradle
# Headers are available via OpenCV SDK

target_include_directories(irongest_jni SYSTEM PRIVATE
    ${ANDROID_NDK}/sources/third_party/opencv/sdk/native/jni/include
)

# ============================================================================
# Debug Configuration
# ============================================================================

if(CMAKE_BUILD_TYPE MATCHES Debug)
    message(STATUS "Building IronGest in DEBUG mode")
    message(STATUS "Source files: ${ALL_SOURCES}")
    message(STATUS "Include dirs: ${CMAKE_CURRENT_SOURCE_DIR}")
else()
    message(STATUS "Building IronGest in RELEASE mode")
endif()

# ============================================================================
# Installation Rules (for local builds)
# ============================================================================

install(TARGETS irongest_jni
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)
