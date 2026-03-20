#!/bin/bash

# Simulator management script

case "$1" in
  start)
    echo "Starting simulator..."
    # Get first available iPhone device
    DEVICE_ID=$(xcrun simctl list devices available | grep "iPhone 16 Pro (" | head -1 | grep -o '[A-F0-9-]\{36\}')
    if [ -z "$DEVICE_ID" ]; then
      echo "No iPhone simulator found"
      exit 1
    fi
    echo "Booting device: $DEVICE_ID"
    xcrun simctl boot "$DEVICE_ID" 2>/dev/null || echo "Device already booted"
    open -a Simulator
    ;;
  
  stop)
    echo "Stopping all simulators..."
    xcrun simctl shutdown all
    killall Simulator 2>/dev/null || true
    ;;
  
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  
  clean)
    echo "Cleaning simulator cache..."
    $0 stop
    # Clear React Native packager cache if exists
    watchman watch-del-all 2>/dev/null || true
    rm -rf $HOME/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
    ;;
  
  status)
    echo "Current simulator status:"
    xcrun simctl list devices | grep "Booted" || echo "No simulators running"
    ;;
  
  *)
    echo "Usage: $0 {start|stop|restart|clean|status}"
    exit 1
    ;;
esac