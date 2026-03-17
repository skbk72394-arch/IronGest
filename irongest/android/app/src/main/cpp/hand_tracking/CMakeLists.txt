# IronGest - Hand Tracking CMake Configuration
# Configures native hand tracking with MediaPipe Hands

cmake_minimum_required(VERSION 3.22.1)
project(hand_tracking_native VERSION 1.0.0 LANGUAGES CXX)

# ============================================================================
# Build Configuration
# ============================================================================

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable position independent code
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Optimization flags
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -ffast-math -funroll-loops")
set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g -DDEBUG")

# ============================================================================
# Source Files
# ============================================================================

file(GLOB_RECURSE CONFIG_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/*.h"
    "${CMAKE_CURRENT_SOURCE_DIR}/*.cc"
)

# ============================================================================
# Dependencies
# ============================================================================

# OpenCV (included via prefab)
find_package(OpenCV REQUIRED)

# ============================================================================
# Shared Library
# ============================================================================

add_library(hand_tracking_native SHARED
    logd("Building hand_tracking_native shared library")
    
    # Source files for shared library
    MediaPipeBridge.cpp
    HandLandmarkTypes.h
    HandTracker.cpp
)

# ============================================================================
# Build Targets
# ============================================================================

# Build the shared library
build_targets(hand_tracking_native
    # Output to libs/armeabi-v7a or libs/arm64-v8a
    # depending on the target architecture
    arm64-v8a
    x86_64
)

