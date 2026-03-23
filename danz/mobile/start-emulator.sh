#!/bin/bash

# Android Emulator Starter Script
# Run Android emulator without opening Android Studio

EMULATOR_PATH=~/Library/Android/sdk/emulator/emulator
AVD_NAME="Pixel_3a_API_34_extension_level_7_arm64-v8a"

echo "Starting Android Emulator: $AVD_NAME"
echo "This will run in the background..."

# Start emulator with optimized settings
$EMULATOR_PATH -avd $AVD_NAME \
  -gpu host \
  -no-boot-anim \
  -no-audio \
  -no-snapshot-load &

echo "Emulator starting in background..."
echo "Run 'npm run android' in a few seconds once the emulator boots"