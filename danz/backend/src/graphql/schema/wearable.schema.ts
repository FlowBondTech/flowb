import { gql } from 'graphql-tag'

export const wearableTypeDefs = gql`
  # ============================================
  # WEARABLE DEVICE SYNC API
  # For smartwatch and fitness tracker integration
  # ============================================

  enum WearableDeviceType {
    APPLE_WATCH
    GALAXY_WATCH
    FITBIT
    GARMIN
    XIAOMI
    WHOOP
    OURA
    OTHER
  }

  enum WearableSyncStatus {
    PENDING
    SYNCING
    COMPLETED
    FAILED
  }

  type WearableDevice {
    id: ID!
    user_id: String!
    device_type: WearableDeviceType!
    device_name: String
    device_model: String
    firmware_version: String
    last_sync_at: DateTime
    sync_status: WearableSyncStatus!
    is_primary: Boolean!
    capabilities: [String!]!
    created_at: DateTime!
    updated_at: DateTime!
    user: User
  }

  type WearableHealthData {
    id: ID!
    user_id: String!
    device_id: String!
    recorded_at: DateTime!
    heart_rate: Int
    heart_rate_variability: Float
    steps: Int
    calories_active: Int
    calories_total: Int
    distance_meters: Float
    floors_climbed: Int
    active_minutes: Int
    sleep_duration_minutes: Int
    sleep_quality_score: Float
    stress_level: Int
    blood_oxygen: Float
    body_temperature: Float
    raw_data: JSON
    created_at: DateTime!
    device: WearableDevice
  }

  type WearableMotionData {
    id: ID!
    user_id: String!
    device_id: String!
    dance_session_id: String
    recorded_at: DateTime!
    accelerometer_x: Float
    accelerometer_y: Float
    accelerometer_z: Float
    gyroscope_x: Float
    gyroscope_y: Float
    gyroscope_z: Float
    motion_intensity: Float
    movement_type: String
    bpm_detected: Int
    rhythm_accuracy: Float
    created_at: DateTime!
    device: WearableDevice
    dance_session: DanceSession
  }

  type WearableSyncResult {
    success: Boolean!
    synced_records: Int!
    failed_records: Int!
    last_sync_at: DateTime
    errors: [String!]
  }

  type WearableStats {
    device_id: String!
    total_syncs: Int!
    total_health_records: Int!
    total_motion_records: Int!
    average_heart_rate: Float
    average_steps_daily: Float
    total_active_minutes: Int!
    last_7_days_activity: [DailyWearableActivity!]!
  }

  type DailyWearableActivity {
    date: String!
    steps: Int!
    calories: Int!
    active_minutes: Int!
    heart_rate_avg: Int
    dance_sessions: Int!
  }

  # Input types
  input RegisterWearableInput {
    device_type: WearableDeviceType!
    device_name: String
    device_model: String
    firmware_version: String
    capabilities: [String!]
    is_primary: Boolean
  }

  input WearableHealthDataInput {
    device_id: String!
    recorded_at: DateTime!
    heart_rate: Int
    heart_rate_variability: Float
    steps: Int
    calories_active: Int
    calories_total: Int
    distance_meters: Float
    floors_climbed: Int
    active_minutes: Int
    sleep_duration_minutes: Int
    sleep_quality_score: Float
    stress_level: Int
    blood_oxygen: Float
    body_temperature: Float
    raw_data: JSON
  }

  input WearableMotionDataInput {
    device_id: String!
    dance_session_id: String
    recorded_at: DateTime!
    accelerometer_x: Float
    accelerometer_y: Float
    accelerometer_z: Float
    gyroscope_x: Float
    gyroscope_y: Float
    gyroscope_z: Float
    motion_intensity: Float
    movement_type: String
    bpm_detected: Int
    rhythm_accuracy: Float
  }

  input SyncWearableDataInput {
    device_id: String!
    health_data: [WearableHealthDataInput!]
    motion_data: [WearableMotionDataInput!]
  }

  # Queries
  extend type Query {
    # Device management
    myWearableDevices: [WearableDevice!]!
    wearableDevice(deviceId: String!): WearableDevice

    # Health data
    myWearableHealthData(
      deviceId: String
      from: DateTime
      to: DateTime
      limit: Int
    ): [WearableHealthData!]!

    # Motion data
    myWearableMotionData(
      deviceId: String
      sessionId: String
      from: DateTime
      to: DateTime
      limit: Int
    ): [WearableMotionData!]!

    # Stats
    wearableStats(deviceId: String): WearableStats

    # Latest readings
    latestWearableReading(deviceId: String): WearableHealthData
  }

  # Mutations
  extend type Mutation {
    # Device management
    registerWearableDevice(input: RegisterWearableInput!): WearableDevice!
    updateWearableDevice(deviceId: String!, input: RegisterWearableInput!): WearableDevice!
    removeWearableDevice(deviceId: String!): MutationResponse!
    setPrimaryWearable(deviceId: String!): WearableDevice!

    # Data sync
    syncWearableData(input: SyncWearableDataInput!): WearableSyncResult!
    syncHealthData(data: [WearableHealthDataInput!]!): WearableSyncResult!
    syncMotionData(data: [WearableMotionDataInput!]!): WearableSyncResult!

    # Manual triggers
    requestWearableSync(deviceId: String!): WearableDevice!
  }
`
