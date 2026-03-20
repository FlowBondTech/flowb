# Wearable & Third-Party App Integration Guide

Complete guide for integrating wearable devices and third-party applications with the DANZ dance-to-earn platform.

## Overview

The DANZ platform supports integration with wearable devices (smartwatches, fitness trackers) and third-party applications to track dance movements, health metrics, and calculate XP rewards.

### Supported Device Categories

| Category | Examples | Data Types |
|----------|----------|------------|
| **Smartwatches** | Apple Watch, Galaxy Watch, Wear OS | Motion, Health, Heart Rate |
| **Fitness Trackers** | Fitbit, Garmin, Whoop | Steps, Heart Rate, Calories |
| **Motion Sensors** | Custom IMU devices | Accelerometer, Gyroscope |
| **Mobile Apps** | Third-party dance apps | Motion data via phone sensors |

---

## Part 1: Authentication & Device Registration

### Step 1: Obtain API Credentials

```graphql
# User must be authenticated first
mutation RegisterWearableDevice($input: WearableDeviceInput!) {
  registerWearableDevice(input: $input) {
    id
    device_type
    device_id
    device_name
    is_primary
    created_at
  }
}
```

**Input Parameters:**

```typescript
interface WearableDeviceInput {
  device_type: DeviceType;      // APPLE_WATCH, FITBIT, GARMIN, etc.
  device_id: string;            // Unique hardware identifier
  device_name?: string;         // User-friendly name
  device_model?: string;        // "Apple Watch Series 9"
  firmware_version?: string;    // Device firmware
}

enum DeviceType {
  APPLE_WATCH
  FITBIT
  GARMIN
  SAMSUNG_GALAXY_WATCH
  WEAR_OS
  WHOOP
  OURA
  CUSTOM
}
```

### Step 2: Device Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Wearable  │      │  Your App   │      │  DANZ API   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. Pair Device    │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │ 2. Register Device │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ 3. Device Token    │
       │                    │<───────────────────│
       │                    │                    │
       │  4. Store Token    │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  5. Sync Data      │                    │
       │───────────────────>│───────────────────>│
       │                    │                    │
```

### Step 3: Set Primary Device

```graphql
mutation SetPrimaryWearable($device_id: String!) {
  setPrimaryWearable(device_id: $device_id) {
    success
    message
  }
}
```

---

## Part 2: Motion Data Integration

Motion data is the core input for dance movement scoring and XP calculation.

### Motion Data Structure

```typescript
interface WearableMotionData {
  device_id: string;
  recorded_at: string;           // ISO 8601 timestamp

  // Raw sensor data
  accelerometer_x: number;       // m/s² or g-force
  accelerometer_y: number;
  accelerometer_z: number;
  gyroscope_x: number;           // rad/s or deg/s
  gyroscope_y: number;
  gyroscope_z: number;

  // Processed metrics (optional - calculated server-side if not provided)
  motion_intensity?: number;     // 0-100 scale
  movement_type?: string;        // Detected dance style
  bpm_detected?: number;         // Beats per minute from movement
  rhythm_accuracy?: number;      // 0-100 sync with music
}
```

### Submitting Motion Data

```graphql
mutation SyncWearableMotion($data: [WearableMotionInput!]!) {
  syncWearableMotion(data: $data) {
    success
    records_processed
    errors {
      index
      message
    }
  }
}
```

**Batch Upload (Recommended):**

```json
{
  "data": [
    {
      "device_id": "uuid-of-device",
      "recorded_at": "2024-01-15T14:30:00.000Z",
      "accelerometer_x": 0.5,
      "accelerometer_y": -0.3,
      "accelerometer_z": 9.8,
      "gyroscope_x": 0.1,
      "gyroscope_y": -0.2,
      "gyroscope_z": 0.05
    },
    // ... up to 1000 records per batch
  ]
}
```

### Sampling Rate Recommendations

| Use Case | Sample Rate | Data Volume |
|----------|-------------|-------------|
| Basic tracking | 10 Hz | ~36KB/min |
| Standard dance | 25 Hz | ~90KB/min |
| Precision scoring | 50 Hz | ~180KB/min |
| Competition mode | 100 Hz | ~360KB/min |

---

## Part 3: Health Data Integration

Health metrics enhance the dance experience and contribute to scoring.

### Health Data Structure

```typescript
interface WearableHealthData {
  device_id: string;
  recorded_at: string;

  // Heart metrics
  heart_rate?: number;              // BPM
  heart_rate_variability?: number;  // HRV in milliseconds
  resting_heart_rate?: number;      // Baseline BPM

  // Activity metrics
  steps?: number;
  distance_meters?: number;
  calories_burned?: number;
  active_minutes?: number;

  // Advanced metrics
  blood_oxygen?: number;            // SpO2 percentage
  stress_level?: number;            // 0-100 scale
  sleep_minutes?: number;
}
```

### Syncing Health Data

```graphql
mutation SyncWearableHealth($data: [WearableHealthInput!]!) {
  syncWearableHealth(data: $data) {
    success
    records_processed
    last_sync_at
  }
}
```

### Health Data → XP Bonus Calculation

Health data contributes to session XP through multipliers:

```
Health Bonus = Base XP × Health Multiplier

Health Multiplier Factors:
├── Heart Rate in Zone (120-160 BPM): +10% XP
├── Sustained Effort (>10 min elevated HR): +5% XP
├── High Calorie Burn (>100 cal/session): +5% XP
└── Recovery Metrics (good HRV): +3% XP

Maximum Health Bonus: 23% additional XP
```

---

## Part 4: Dance Session Integration

### Starting a Dance Session

```graphql
mutation StartDanceSession($input: StartSessionInput!) {
  startDanceSession(input: $input) {
    session_id
    started_at
    style
    difficulty
  }
}
```

**Input:**

```typescript
interface StartSessionInput {
  style?: DanceStyle;           // Optional - auto-detected if not provided
  song_id?: string;             // Link to music being played
  device_ids?: string[];        // Wearable devices to use
  mode?: SessionMode;           // PRACTICE, CHALLENGE, SOCIAL
}
```

### Streaming Motion During Session

For real-time scoring, stream motion data during the session:

```graphql
mutation StreamSessionMotion($session_id: String!, $motion: [MotionFrame!]!) {
  streamSessionMotion(session_id: $session_id, motion: $motion) {
    frames_processed
    current_score
    combo_multiplier
  }
}
```

### Ending a Dance Session

```graphql
mutation EndDanceSession($session_id: String!, $stats: SessionStats!) {
  endDanceSession(session_id: $session_id, stats: $stats) {
    session {
      id
      duration_seconds
      xp_earned
      movement_score
      calories_burned
      bpm_average
    }
    rewards {
      xp
      tokens
      badges_earned
    }
    level_progress {
      current_level
      xp_to_next
      progress_percentage
    }
  }
}
```

---

## Part 5: Point System & XP Calculation

### Multi-Dimensional Scoring Formula

The DANZ scoring system evaluates dance performance across multiple dimensions:

```
Final Score = Σ(Dimension Score × Weight) × Multipliers

Dimensions:
├── Movement Intensity (25%)     - Energy and amplitude of movements
├── Rhythm Accuracy (25%)        - Sync with music beat
├── Variety Score (20%)          - Diversity of movement patterns
├── Duration Factor (15%)        - Sustained dance time
└── Skill Execution (15%)        - Quality of specific moves
```

### Movement Score Calculation

```typescript
// Server-side calculation from motion data
function calculateMovementScore(motionData: MotionFrame[]): number {
  const intensity = calculateIntensity(motionData);      // 0-100
  const rhythm = calculateRhythmSync(motionData);        // 0-100
  const variety = calculateMovementVariety(motionData);  // 0-100
  const skill = detectSkillMoves(motionData);            // 0-100

  return (
    intensity * 0.25 +
    rhythm * 0.25 +
    variety * 0.20 +
    skill * 0.15 +
    durationBonus * 0.15
  );
}
```

### XP Conversion Table

| Movement Score | Base XP/Minute | Tier |
|----------------|----------------|------|
| 0-20 | 5 XP | Beginner |
| 21-40 | 10 XP | Casual |
| 41-60 | 20 XP | Intermediate |
| 61-80 | 35 XP | Advanced |
| 81-100 | 50 XP | Expert |

### Multiplier System

```
Total XP = Base XP × Streak Multiplier × Combo Multiplier × Event Multiplier

Streak Multiplier:
├── Day 1-6:   1.0x
├── Day 7:     1.5x (Weekly bonus)
├── Day 8-13:  1.1x
├── Day 14:    1.75x (Two-week bonus)
├── Day 30:    2.0x (Monthly bonus)
└── Day 30+:   2.0x + 0.01x per additional day (max 2.5x)

Combo Multiplier (during session):
├── 10 good moves:   1.1x
├── 25 good moves:   1.25x
├── 50 good moves:   1.5x
└── 100 good moves:  2.0x

Event Multiplier:
├── Happy Hour:      1.5x
├── Weekend Boost:   1.25x
├── Special Event:   2.0x-5.0x
└── Challenge Mode:  1.5x-3.0x
```

---

## Part 6: Anti-Cheat Integration

### Device Integrity Checks

Your integration must pass these validation checks:

```typescript
interface DeviceIntegrityReport {
  device_id: string;
  timestamp: string;

  // Required attestations
  hardware_attestation: string;      // Platform-specific proof
  motion_sensor_status: 'active' | 'simulated' | 'unknown';
  gps_consistency: boolean;          // Location hasn't jumped

  // Optional enhanced checks
  heart_rate_correlation?: boolean;  // HR matches activity level
  skin_contact?: boolean;            // Device worn on skin
}
```

### Motion Data Validation

The server validates incoming motion data against:

1. **Physical Plausibility**
   - Acceleration within human limits (<15g)
   - Rotation rates within natural range
   - Smooth transitions (no teleportation)

2. **Pattern Analysis**
   - Natural movement variance (not synthetic)
   - Appropriate fatigue patterns over time
   - Consistent with declared dance style

3. **Cross-Validation**
   - Heart rate correlates with intensity
   - Calorie burn matches effort
   - Multiple sensor agreement

### Penalty System

| Violation | Penalty |
|-----------|---------|
| Suspicious pattern detected | -50% XP for session |
| Failed integrity check | Session invalidated |
| Repeated violations | Account review |
| Confirmed cheating | Account suspension |

---

## Part 7: Real-Time Subscriptions

### Live Score Updates

```graphql
subscription OnSessionScoreUpdate($session_id: String!) {
  sessionScoreUpdate(session_id: $session_id) {
    current_score
    movement_score
    combo_count
    combo_multiplier
    xp_earned_so_far
  }
}
```

### Device Sync Status

```graphql
subscription OnWearableSyncStatus($device_id: String!) {
  wearableSyncStatus(device_id: $device_id) {
    connected
    battery_level
    last_data_at
    sync_quality
  }
}
```

---

## Part 8: Platform-Specific Implementation

### Apple Watch (watchOS)

```swift
import HealthKit
import CoreMotion

class DANZWatchManager {
    let healthStore = HKHealthStore()
    let motionManager = CMMotionManager()

    func startDanceSession() {
        // Request HealthKit permissions
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            if success {
                self.startMotionUpdates()
                self.startHeartRateQuery()
            }
        }
    }

    func startMotionUpdates() {
        motionManager.deviceMotionUpdateInterval = 1.0 / 50.0  // 50 Hz
        motionManager.startDeviceMotionUpdates(to: .main) { motion, error in
            guard let motion = motion else { return }

            let frame = MotionFrame(
                accelerometer_x: motion.userAcceleration.x,
                accelerometer_y: motion.userAcceleration.y,
                accelerometer_z: motion.userAcceleration.z,
                gyroscope_x: motion.rotationRate.x,
                gyroscope_y: motion.rotationRate.y,
                gyroscope_z: motion.rotationRate.z,
                recorded_at: Date()
            )

            self.bufferMotionFrame(frame)
        }
    }

    func syncToDANZ(frames: [MotionFrame]) async {
        // Batch upload to DANZ API
        let mutation = SyncWearableMotionMutation(data: frames)
        let result = await apollo.perform(mutation: mutation)
        // Handle result
    }
}
```

### Fitbit (Web API)

```javascript
// Fitbit OAuth2 flow → Get access token
// Then fetch and sync data

async function syncFitbitToDANZ(userId, accessToken, date) {
  // Fetch heart rate data from Fitbit
  const heartRateResponse = await fetch(
    `https://api.fitbit.com/1/user/${userId}/activities/heart/date/${date}/1d/1sec.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const heartRateData = await heartRateResponse.json();

  // Fetch activity data
  const activityResponse = await fetch(
    `https://api.fitbit.com/1/user/${userId}/activities/date/${date}.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const activityData = await activityResponse.json();

  // Transform to DANZ format
  const healthRecords = transformFitbitToDANZ(heartRateData, activityData);

  // Sync to DANZ
  const result = await danzClient.mutate({
    mutation: SYNC_WEARABLE_HEALTH,
    variables: { data: healthRecords }
  });

  return result;
}

function transformFitbitToDANZ(heartRate, activity) {
  return heartRate['activities-heart-intraday'].dataset.map(point => ({
    recorded_at: `${date}T${point.time}`,
    heart_rate: point.value,
    steps: activity.summary.steps,
    calories_burned: activity.summary.caloriesOut,
    active_minutes: activity.summary.fairlyActiveMinutes +
                    activity.summary.veryActiveMinutes
  }));
}
```

### Garmin (Connect IQ)

```javascript
// Garmin Connect IQ SDK integration
import Toybox.ActivityMonitor;
import Toybox.Sensor;

class DANZDataField extends Ui.DataField {
    var heartRate = 0;
    var motionBuffer = [];

    function initialize() {
        DataField.initialize();
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
        Sensor.enableSensorEvents(method(:onSensor));
    }

    function onSensor(sensorInfo) {
        if (sensorInfo.heartRate != null) {
            heartRate = sensorInfo.heartRate;
        }

        if (sensorInfo.accel != null) {
            motionBuffer.add({
                "x": sensorInfo.accel[0],
                "y": sensorInfo.accel[1],
                "z": sensorInfo.accel[2],
                "hr": heartRate,
                "ts": Time.now().value()
            });
        }

        // Batch sync every 100 frames
        if (motionBuffer.size() >= 100) {
            syncToDANZ();
        }
    }

    function syncToDANZ() {
        var request = new Communications.HttpRequest();
        request.url = "https://danz-backend.fly.dev/graphql";
        request.method = Communications.HTTP_REQUEST_METHOD_POST;
        request.body = formatGraphQLMutation(motionBuffer);
        request.makeRequest();
        motionBuffer = [];
    }
}
```

### Android / Wear OS (Kotlin)

```kotlin
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.health.services.client.HealthServicesClient
import androidx.health.services.client.data.DataType
import kotlinx.coroutines.flow.collect

class DANZWearService : SensorEventListener {
    private lateinit var sensorManager: SensorManager
    private lateinit var healthClient: HealthServicesClient
    private val motionBuffer = mutableListOf<MotionFrame>()
    private var currentHeartRate = 0

    fun startDanceSession(context: Context) {
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        healthClient = HealthServicesClient.getClient(context)

        // Register accelerometer and gyroscope
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        sensorManager.registerListener(
            this,
            accelerometer,
            SensorManager.SENSOR_DELAY_GAME  // ~50 Hz
        )
        sensorManager.registerListener(
            this,
            gyroscope,
            SensorManager.SENSOR_DELAY_GAME
        )

        // Start heart rate monitoring via Health Services
        startHeartRateMonitoring()
    }

    private fun startHeartRateMonitoring() {
        val passiveMonitoringClient = healthClient.passiveMonitoringClient

        lifecycleScope.launch {
            passiveMonitoringClient.getPassiveMonitoringDataFlow()
                .collect { dataPoints ->
                    dataPoints.getData(DataType.HEART_RATE_BPM).forEach { point ->
                        currentHeartRate = point.value.toInt()
                    }
                }
        }
    }

    private var lastAccel = FloatArray(3)
    private var lastGyro = FloatArray(3)

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                lastAccel = event.values.clone()
            }
            Sensor.TYPE_GYROSCOPE -> {
                lastGyro = event.values.clone()

                // Create motion frame when we have both readings
                val frame = MotionFrame(
                    accelerometer_x = lastAccel[0].toDouble(),
                    accelerometer_y = lastAccel[1].toDouble(),
                    accelerometer_z = lastAccel[2].toDouble(),
                    gyroscope_x = lastGyro[0].toDouble(),
                    gyroscope_y = lastGyro[1].toDouble(),
                    gyroscope_z = lastGyro[2].toDouble(),
                    heart_rate = currentHeartRate,
                    recorded_at = System.currentTimeMillis()
                )

                motionBuffer.add(frame)

                // Batch sync every 100 frames
                if (motionBuffer.size >= 100) {
                    syncToDANZ()
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun syncToDANZ() {
        val framesToSync = motionBuffer.toList()
        motionBuffer.clear()

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = apolloClient.mutation(
                    SyncWearableMotionMutation(
                        data = framesToSync.map { it.toGraphQLInput() }
                    )
                ).execute()

                if (response.hasErrors()) {
                    // Re-queue on failure
                    motionBuffer.addAll(0, framesToSync)
                }
            } catch (e: Exception) {
                // Handle offline - re-queue data
                motionBuffer.addAll(0, framesToSync)
            }
        }
    }

    fun stopSession() {
        sensorManager.unregisterListener(this)
        // Sync remaining data
        if (motionBuffer.isNotEmpty()) {
            syncToDANZ()
        }
    }
}

data class MotionFrame(
    val accelerometer_x: Double,
    val accelerometer_y: Double,
    val accelerometer_z: Double,
    val gyroscope_x: Double,
    val gyroscope_y: Double,
    val gyroscope_z: Double,
    val heart_rate: Int,
    val recorded_at: Long
) {
    fun toGraphQLInput() = WearableMotionInput(
        accelerometer_x = accelerometer_x,
        accelerometer_y = accelerometer_y,
        accelerometer_z = accelerometer_z,
        gyroscope_x = gyroscope_x,
        gyroscope_y = gyroscope_y,
        gyroscope_z = gyroscope_z,
        recorded_at = Instant.ofEpochMilli(recorded_at).toString()
    )
}
```

### Android Phone (Companion App)

For users without a smartwatch, use phone sensors:

```kotlin
class DANZPhoneTracker(private val context: Context) : SensorEventListener {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val motionBuffer = mutableListOf<MotionFrame>()

    fun startTracking() {
        // Use phone's accelerometer and gyroscope
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
        val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        // Register with game delay for smooth tracking
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        // Same processing as Wear OS
        // Buffer and sync motion data to DANZ API
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    fun stopTracking() {
        sensorManager.unregisterListener(this)
    }
}
```

### Samsung Galaxy Watch (Tizen/Wear OS)

```kotlin
// For Galaxy Watch 4+ (Wear OS based)
// Use the same Android/Wear OS implementation above

// For older Galaxy Watch (Tizen)
// Use Samsung Health SDK:
import com.samsung.android.sdk.healthdata.*

class DANZSamsungHealth(private val context: Context) {
    private lateinit var healthDataStore: HealthDataStore
    private val connectionListener = object : HealthDataStore.ConnectionListener {
        override fun onConnected() {
            // Start reading health data
            startHealthDataSync()
        }
        override fun onConnectionFailed(error: HealthConnectionErrorResult) {
            // Handle connection failure
        }
        override fun onDisconnected() {}
    }

    fun connect() {
        healthDataStore = HealthDataStore(context, connectionListener)
        healthDataStore.connectService()
    }

    private fun startHealthDataSync() {
        val resolver = HealthDataResolver(healthDataStore, null)

        // Query heart rate data
        val request = HealthDataResolver.ReadRequest.Builder()
            .setDataType(HealthConstants.HeartRate.HEALTH_DATA_TYPE)
            .setProperties(arrayOf(
                HealthConstants.HeartRate.HEART_RATE,
                HealthConstants.HeartRate.START_TIME
            ))
            .build()

        resolver.read(request).setResultListener { result ->
            result.forEach { data ->
                val heartRate = data.getInt(HealthConstants.HeartRate.HEART_RATE)
                val timestamp = data.getLong(HealthConstants.HeartRate.START_TIME)
                // Sync to DANZ
            }
        }
    }
}
```

---

## Part 9: Error Handling & Recovery

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `DEVICE_NOT_REGISTERED` | Device ID not found | Call registerWearableDevice first |
| `INVALID_MOTION_DATA` | Malformed sensor data | Check data format and ranges |
| `SESSION_NOT_ACTIVE` | No active dance session | Call startDanceSession first |
| `SYNC_RATE_EXCEEDED` | Too many requests | Implement batching, reduce frequency |
| `INTEGRITY_CHECK_FAILED` | Anti-cheat triggered | Verify device attestation |
| `DEVICE_OFFLINE` | Lost connection | Queue data locally, sync when online |

### Offline Data Handling

```typescript
class OfflineDataManager {
  private queue: MotionFrame[] = [];
  private maxQueueSize = 10000;

  addFrame(frame: MotionFrame) {
    if (this.queue.length >= this.maxQueueSize) {
      // Drop oldest frames
      this.queue.shift();
    }
    this.queue.push(frame);
  }

  async syncWhenOnline() {
    if (!navigator.onLine || this.queue.length === 0) return;

    const batch = this.queue.splice(0, 1000);
    try {
      await danzClient.mutate({
        mutation: SYNC_WEARABLE_MOTION,
        variables: { data: batch }
      });
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...batch);
    }
  }
}
```

---

## Part 10: Testing & Validation

### Test Endpoints

```graphql
# Validate motion data format without recording
mutation ValidateMotionData($data: [WearableMotionInput!]!) {
  validateMotionData(data: $data) {
    valid
    errors {
      field
      message
    }
    calculated_score
  }
}

# Simulate a dance session for testing
mutation SimulateDanceSession($duration_seconds: Int!, $style: DanceStyle!) {
  simulateDanceSession(duration_seconds: $duration_seconds, style: $style) {
    session_id
    simulated_score
    expected_xp
    test_mode: true
  }
}
```

### Certification Checklist

Before going live, verify:

- [ ] Device registration works correctly
- [ ] Motion data passes validation
- [ ] Health data syncs properly
- [ ] Sessions start/end cleanly
- [ ] XP calculation matches expected values
- [ ] Anti-cheat checks pass
- [ ] Offline sync recovery works
- [ ] Error handling covers all cases
- [ ] Rate limiting is implemented
- [ ] Data privacy compliance met

---

## API Reference

### GraphQL Endpoint

```
Production: https://danz-backend.fly.dev/graphql
Staging: https://danz-backend-staging.fly.dev/graphql
```

### Authentication Header

```http
Authorization: Bearer <user_jwt_token>
X-Device-ID: <registered_device_id>
```

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Motion sync | 60 req/min | Per device |
| Health sync | 30 req/min | Per device |
| Session control | 10 req/min | Per user |
| Query endpoints | 100 req/min | Per user |

---

## Support & Resources

- **API Documentation**: [/api/wearables](/api/wearables)
- **Database Schema**: [/database/cross-platform](/database/cross-platform)
- **Point System Details**: [/guide/point-system](/guide/point-system)
- **Developer Discord**: [discord.gg/danz](https://discord.gg/danz)
- **GitHub Issues**: [github.com/FlowBondTech](https://github.com/FlowBondTech)

