# DANZ Mobile - Technical Implementation Guide

## React to React Native Conversion Guide

### Project Setup (Day 1)

```bash
# Create new Expo project
npx create-expo-app danz-mobile --template expo-template-blank-typescript
cd danz-mobile

# Core dependencies
npx expo install expo-camera expo-sensors expo-location expo-notifications expo-secure-store expo-haptics expo-av

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# State management
npm install zustand @tanstack/react-query

# UI libraries
npm install react-native-reanimated react-native-gesture-handler
npm install react-native-linear-gradient react-native-vector-icons
```

### Directory Structure

```
danz-mobile/
├── app.json                 # Expo configuration
├── App.tsx                   # Entry point
├── src/
│   ├── navigation/          # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── Home/
│   │   ├── Dance/
│   │   ├── Rewards/
│   │   ├── Events/
│   │   └── Profile/
│   ├── components/          # Reusable components
│   │   ├── common/
│   │   ├── dance/
│   │   └── social/
│   ├── hooks/               # Custom hooks
│   │   ├── useDanceTracking.ts
│   │   ├── useMotionSensors.ts
│   │   └── useRewards.ts
│   ├── services/            # API and external services
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── storage.ts
│   ├── store/               # Zustand stores
│   │   ├── authStore.ts
│   │   ├── danceStore.ts
│   │   └── rewardStore.ts
│   ├── styles/              # Global styles
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   └── utils/               # Utility functions
│       ├── motion.ts
│       └── validation.ts
```

## Component Migration Patterns

### 1. CSS to StyleSheet Conversion

```typescript
// Web (CSS)
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

// React Native (StyleSheet)
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const styles = StyleSheet.create({
  hero: {
    padding: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10, // Android shadow
  }
});

// Component usage
<LinearGradient
  colors={['#667eea', '#764ba2']}
  start={{x: 0, y: 0}}
  end={{x: 1, y: 1}}
  style={styles.hero}
>
  {/* Content */}
</LinearGradient>
```

### 2. Navigation Migration

```typescript
// Web (React Router)
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dance" element={<Dance />} />
      </Routes>
    </BrowserRouter>
  );
}

// React Native (React Navigation)
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Dance" component={DanceScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

### 3. Event Handling Migration

```typescript
// Web
<button onClick={handleClick}>Start Dancing</button>

// React Native
<TouchableOpacity onPress={handlePress}>
  <Text>Start Dancing</Text>
</TouchableOpacity>
```

## Core Feature Implementations

### 1. Motion Tracking System

```typescript
// hooks/useMotionSensors.ts
import { useEffect, useState } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Subscription } from 'expo-sensors/build/Pedometer';

interface MotionData {
  timestamp: number;
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
}

export const useMotionSensors = () => {
  const [data, setData] = useState<MotionData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const startRecording = () => {
    setData([]);
    setIsRecording(true);
    
    // Set update interval to 100ms for 10Hz sampling
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);
    
    const accelSub = Accelerometer.addListener(accelData => {
      Gyroscope.isAvailableAsync().then(() => {
        setData(prev => [...prev, {
          timestamp: Date.now(),
          accel: accelData,
          gyro: { x: 0, y: 0, z: 0 } // Will be updated by gyro listener
        }]);
      });
    });
    
    const gyroSub = Gyroscope.addListener(gyroData => {
      setData(prev => {
        const last = prev[prev.length - 1];
        if (last) {
          last.gyro = gyroData;
        }
        return [...prev];
      });
    });
    
    setSubscriptions([accelSub, gyroSub]);
  };

  const stopRecording = () => {
    subscriptions.forEach(sub => sub.remove());
    setSubscriptions([]);
    setIsRecording(false);
    return data;
  };

  const calculateIntensity = (data: MotionData[]): number => {
    if (data.length === 0) return 0;
    
    const magnitudes = data.map(d => 
      Math.sqrt(d.accel.x ** 2 + d.accel.y ** 2 + d.accel.z ** 2)
    );
    
    const avg = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, val) => 
      sum + Math.pow(val - avg, 2), 0
    ) / magnitudes.length;
    
    return Math.min(variance * 10, 100); // Normalize to 0-100
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    calculateIntensity,
    motionData: data
  };
};
```

### 2. Video Recording with Overlay

```typescript
// screens/Dance/RecordScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { useMotionSensors } from '../../hooks/useMotionSensors';

export const RecordScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const cameraRef = useRef<Camera>(null);
  const { startRecording, stopRecording, calculateIntensity, motionData } = useMotionSensors();
  
  const handleRecord = async () => {
    if (!isRecording && cameraRef.current) {
      setIsRecording(true);
      startRecording();
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: Camera.Constants.VideoQuality['720p'],
      });
      
      const intensity = calculateIntensity(motionData);
      await uploadDance(video.uri, motionData, intensity);
    } else if (cameraRef.current) {
      cameraRef.current.stopRecording();
      const finalData = stopRecording();
      setIsRecording(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>We need camera permission</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera 
        ref={cameraRef}
        style={styles.camera} 
        type={CameraType.front}
      >
        <View style={styles.overlay}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.recordButton, isRecording && styles.recordingActive]}
            onPress={handleRecord}
          >
            <View style={styles.recordButtonInner} />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff6ec7',
  },
  recordingActive: {
    borderColor: '#ff6ec7',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 16,
  },
});
```

### 3. Reward System with Real-time Updates

```typescript
// store/rewardStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface RewardStore {
  balance: number;
  pendingRewards: number;
  history: Transaction[];
  claimReward: (amount: number, reason: string) => Promise<void>;
  syncBalance: () => Promise<void>;
}

export const useRewardStore = create<RewardStore>()(
  subscribeWithSelector((set, get) => ({
    balance: 0,
    pendingRewards: 0,
    history: [],
    
    claimReward: async (amount, reason) => {
      // Optimistic update
      set(state => ({
        pendingRewards: state.pendingRewards + amount
      }));
      
      try {
        const response = await api.post('/rewards/claim', { amount, reason });
        set(state => ({
          balance: state.balance + amount,
          pendingRewards: state.pendingRewards - amount,
          history: [...state.history, response.data.transaction]
        }));
      } catch (error) {
        // Rollback on error
        set(state => ({
          pendingRewards: state.pendingRewards - amount
        }));
        throw error;
      }
    },
    
    syncBalance: async () => {
      const response = await api.get('/wallet/balance');
      set({ balance: response.data.balance });
    }
  }))
);

// Subscribe to balance changes for UI updates
useRewardStore.subscribe(
  state => state.balance,
  balance => {
    // Trigger celebration animation when balance increases
    if (balance > useRewardStore.getState().balance) {
      HapticFeedback.notification(HapticFeedback.NotificationTypes.Success);
    }
  }
);
```

### 4. Social Feed Implementation

```typescript
// screens/Home/FeedScreen.tsx
import React from 'react';
import { FlatList, View, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { useQuery } from '@tanstack/react-query';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FeedScreen = () => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: fetchFeedVideos,
  });

  const renderVideo = ({ item, index }) => (
    <View style={{ height: SCREEN_HEIGHT }}>
      <Video
        source={{ uri: item.videoUrl }}
        style={{ flex: 1 }}
        shouldPlay={index === 0} // Auto-play first video
        isLooping
        resizeMode="cover"
      />
      <VideoOverlay video={item} />
    </View>
  );

  return (
    <FlatList
      data={videos}
      renderItem={renderVideo}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={SCREEN_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
    />
  );
};
```

### 5. Push Notifications Setup

```typescript
// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) return null;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') return null;
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Save token to backend
  await api.post('/notifications/register', { token });
  
  return token;
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

## State Management Architecture

### Zustand Store Setup

```typescript
// store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data;
        
        set({ user, token });
        
        // Store secure token
        await SecureStore.setItemAsync('authToken', token);
      },
      
      logout: () => {
        set({ user: null, token: null });
        SecureStore.deleteItemAsync('authToken');
      },
      
      refreshToken: async () => {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        
        const response = await api.post('/auth/refresh', { token });
        set({ token: response.data.token });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
```

## Performance Optimization

### 1. Image Optimization

```typescript
// components/OptimizedImage.tsx
import React from 'react';
import { Image } from 'react-native';
import FastImage from 'react-native-fast-image';

export const OptimizedImage = ({ source, style, ...props }) => {
  return (
    <FastImage
      source={{
        uri: source,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      style={style}
      resizeMode={FastImage.resizeMode.cover}
      {...props}
    />
  );
};
```

### 2. List Optimization

```typescript
// Use FlashList instead of FlatList for better performance
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={data}
  renderItem={renderItem}
  estimatedItemSize={200}
  keyExtractor={item => item.id}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

### 3. Animation Optimization

```typescript
// Use Reanimated 3 for smooth 60 FPS animations
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedButton = () => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));
  
  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
  };
  
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress}>
        <Text>Tap Me</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
```

## Deployment Configuration

### app.json Configuration

```json
{
  "expo": {
    "name": "DANZ",
    "slug": "danz-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.danz.mobile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "DANZ needs camera access to record your dance videos",
        "NSMotionUsageDescription": "DANZ needs motion access to track your dance movements",
        "NSLocationWhenInUseUsageDescription": "DANZ needs location to find events near you"
      }
    },
    "plugins": [
      "expo-camera",
      "expo-sensors",
      "expo-notifications"
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildNumber": "auto"
      }
    },
    "production": {
      "ios": {
        "buildNumber": "auto"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

## Testing Strategy

### Unit Testing

```typescript
// __tests__/motion.test.ts
import { calculateIntensity } from '../utils/motion';

describe('Motion Analysis', () => {
  test('calculates intensity correctly', () => {
    const mockData = [
      { timestamp: 1, accel: { x: 0.1, y: 0.2, z: 0.3 }, gyro: { x: 0, y: 0, z: 0 }},
      { timestamp: 2, accel: { x: 0.5, y: 0.6, z: 0.7 }, gyro: { x: 0, y: 0, z: 0 }},
    ];
    
    const intensity = calculateIntensity(mockData);
    expect(intensity).toBeGreaterThan(0);
    expect(intensity).toBeLessThanOrEqual(100);
  });
});
```

### E2E Testing with Detox

```javascript
// e2e/firstTest.e2e.js
describe('Dance Recording Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show welcome screen', async () => {
    await expect(element(by.id('welcome'))).toBeVisible();
  });

  it('should navigate to dance screen', async () => {
    await element(by.id('dance-tab')).tap();
    await expect(element(by.id('record-button'))).toBeVisible();
  });

  it('should start recording', async () => {
    await element(by.id('record-button')).tap();
    await expect(element(by.text('Recording'))).toBeVisible();
  });
});
```

## Launch Checklist

### Week 1
- [ ] Project setup complete
- [ ] Navigation structure working
- [ ] Basic screens implemented
- [ ] Authentication flow complete

### Week 2
- [ ] Motion tracking functional
- [ ] Video recording working
- [ ] Basic API integration

### Week 3
- [ ] Rewards system complete
- [ ] Social feed implemented
- [ ] Push notifications setup

### Week 4
- [ ] Event system working
- [ ] Location services integrated
- [ ] Offline support added

### Week 5
- [ ] Performance optimized
- [ ] All animations smooth (60 FPS)
- [ ] Error handling complete
- [ ] Beta testing started

### Week 6
- [ ] App Store assets ready
- [ ] Privacy policy updated
- [ ] TestFlight build submitted
- [ ] Launch preparations complete

## Conclusion

This technical guide provides the concrete implementation details needed to convert the DANZ web application to a native iOS app in 6 weeks. Focus on core functionality first, optimize performance continuously, and iterate based on user feedback post-launch.