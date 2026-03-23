# Wearables API

The Wearables API enables integration with smartwatches and fitness trackers to capture real-time dance and health metrics.

## Supported Devices

| Device | Type | Features |
|--------|------|----------|
| Apple Watch | `APPLE_WATCH` | Heart rate, motion, steps, calories |
| Fitbit | `FITBIT` | Heart rate, steps, sleep, calories |
| Garmin | `GARMIN` | Heart rate, GPS, advanced metrics |
| Samsung Galaxy Watch | `SAMSUNG_GALAXY` | Heart rate, motion, steps |
| Xiaomi Mi Band | `XIAOMI_MI_BAND` | Heart rate, steps, sleep |
| Whoop | `WHOOP` | Strain, recovery, HRV |

## Device Registration

### Register a Device

```graphql
mutation RegisterWearableDevice($input: RegisterWearableDeviceInput!) {
  registerWearableDevice(input: $input) {
    id
    device_type
    device_name
    device_id
    is_primary
    last_sync_at
    created_at
  }
}
```

**Input:**
```typescript
interface RegisterWearableDeviceInput {
  device_type: WearableDeviceType
  device_id: string       // Unique device identifier
  device_name?: string    // User-friendly name
  device_model?: string   // Model name
  firmware_version?: string
}
```

### Remove a Device

```graphql
mutation RemoveWearableDevice($deviceId: String!) {
  removeWearableDevice(deviceId: $deviceId) {
    success
    message
  }
}
```

### Get User's Devices

```graphql
query GetWearableDevices {
  getWearableDevices {
    id
    device_type
    device_name
    device_model
    is_primary
    battery_level
    last_sync_at
  }
}
```

## Health Data Sync

### Sync Health Metrics

```graphql
mutation SyncHealthData($input: SyncHealthDataInput!) {
  syncHealthData(input: $input) {
    id
    heart_rate
    heart_rate_variability
    steps
    calories_burned
    active_minutes
    recorded_at
  }
}
```

**Input:**
```typescript
interface SyncHealthDataInput {
  device_id: string
  recorded_at: DateTime
  heart_rate?: number           // BPM
  heart_rate_variability?: number // ms
  resting_heart_rate?: number
  steps?: number
  distance_meters?: number
  calories_burned?: number
  active_minutes?: number
  sleep_minutes?: number
  blood_oxygen?: number         // SpO2 percentage
  stress_level?: number         // 0-100
}
```

### Get Health History

```graphql
query GetHealthDataHistory(
  $deviceId: String
  $startDate: DateTime!
  $endDate: DateTime!
  $granularity: DataGranularity
) {
  getHealthDataHistory(
    deviceId: $deviceId
    startDate: $startDate
    endDate: $endDate
    granularity: $granularity
  ) {
    items {
      recorded_at
      heart_rate
      steps
      calories_burned
      active_minutes
    }
    aggregates {
      avg_heart_rate
      total_steps
      total_calories
      total_active_minutes
    }
  }
}
```

**Granularity Options:**
- `MINUTE` - Per-minute data (max 24 hours)
- `HOUR` - Hourly aggregates (max 7 days)
- `DAY` - Daily aggregates (max 90 days)
- `WEEK` - Weekly aggregates (max 1 year)

## Motion Data Sync

For real-time dance tracking with accelerometer and gyroscope data.

### Sync Motion Data

```graphql
mutation SyncMotionData($input: SyncMotionDataInput!) {
  syncMotionData(input: $input) {
    id
    motion_intensity
    movement_type
    bpm_detected
    rhythm_accuracy
    recorded_at
  }
}
```

**Input:**
```typescript
interface SyncMotionDataInput {
  device_id: string
  dance_session_id?: string     // Link to active session
  recorded_at: DateTime
  accelerometer_x?: number
  accelerometer_y?: number
  accelerometer_z?: number
  gyroscope_x?: number
  gyroscope_y?: number
  gyroscope_z?: number
  motion_intensity?: number     // 0-100
  movement_type?: string        // "hip_hop", "salsa", etc.
  bpm_detected?: number
  rhythm_accuracy?: number      // 0-100
}
```

### Get Motion Summary

```graphql
query GetMotionSummary($sessionId: String!) {
  getMotionSummary(sessionId: $sessionId) {
    total_movements
    avg_intensity
    peak_intensity
    dominant_movement_type
    avg_bpm
    rhythm_score
    duration_seconds
  }
}
```

## Real-time Subscriptions

### Live Health Updates

```graphql
subscription OnHealthDataUpdate {
  healthDataUpdated {
    device_id
    heart_rate
    calories_burned
    recorded_at
  }
}
```

### Live Motion Updates

```graphql
subscription OnMotionDataUpdate($sessionId: String!) {
  motionDataUpdated(sessionId: $sessionId) {
    motion_intensity
    bpm_detected
    rhythm_accuracy
    recorded_at
  }
}
```

## Database Schema

### wearable_devices

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | References users.privy_id |
| device_type | ENUM | Device manufacturer type |
| device_id | TEXT | Unique device identifier |
| device_name | TEXT | User-friendly name |
| device_model | TEXT | Model name |
| firmware_version | TEXT | Current firmware |
| is_primary | BOOLEAN | Primary device flag |
| battery_level | INTEGER | Last known battery % |
| last_sync_at | TIMESTAMPTZ | Last successful sync |
| created_at | TIMESTAMPTZ | Registration time |

### wearable_health_data

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference |
| device_id | UUID | Device reference |
| recorded_at | TIMESTAMPTZ | Measurement time |
| heart_rate | INTEGER | BPM |
| heart_rate_variability | FLOAT | HRV in ms |
| steps | INTEGER | Step count |
| calories_burned | INTEGER | Calories |
| active_minutes | INTEGER | Active time |

### wearable_motion_data

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User reference |
| device_id | UUID | Device reference |
| dance_session_id | UUID | Optional session link |
| recorded_at | TIMESTAMPTZ | Measurement time |
| accelerometer_x/y/z | FLOAT | Acceleration data |
| gyroscope_x/y/z | FLOAT | Rotation data |
| motion_intensity | FLOAT | 0-100 intensity |
| movement_type | TEXT | Detected dance style |
| bpm_detected | INTEGER | Detected BPM |
| rhythm_accuracy | FLOAT | 0-100 accuracy |

## Integration Guide

### Apple Watch (HealthKit)

```typescript
// Request HealthKit permissions
const permissions = [
  HKQuantityType.heartRate,
  HKQuantityType.stepCount,
  HKQuantityType.activeEnergyBurned,
]

// Sync data to DANZ
await syncHealthData({
  device_id: watch.identifier,
  heart_rate: latestHeartRate,
  steps: todaySteps,
  calories_burned: todayCalories,
  recorded_at: new Date().toISOString(),
})
```

### Fitbit (Web API)

```typescript
// OAuth2 flow for Fitbit
const fitbitData = await fitbit.getHeartRate(date)

await syncHealthData({
  device_id: fitbitDevice.id,
  heart_rate: fitbitData.value,
  recorded_at: fitbitData.dateTime,
})
```

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Health sync | 60/minute |
| Motion sync | 120/minute |
| History queries | 30/minute |

## Error Codes

| Code | Description |
|------|-------------|
| `DEVICE_NOT_FOUND` | Device ID not registered |
| `DEVICE_ALREADY_EXISTS` | Device already registered |
| `INVALID_DATA_RANGE` | Date range too large |
| `SYNC_RATE_LIMITED` | Too many sync requests |
