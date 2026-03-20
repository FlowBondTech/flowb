import * as Haptics from 'expo-haptics'
import {
  Accelerometer,
  type AccelerometerMeasurement,
  DeviceMotion,
  type DeviceMotionMeasurement,
  Gyroscope,
  type GyroscopeMeasurement,
  Pedometer,
} from 'expo-sensors'

export interface MotionData {
  timestamp: number
  accelerometer: AccelerometerMeasurement
  gyroscope?: GyroscopeMeasurement
  deviceMotion?: DeviceMotionMeasurement
  intensity: number
  bpm?: number
  isValidMotion: boolean
}

export interface MotionPattern {
  periodicity: number
  variance: number
  peakCount: number
  avgIntensity: number
  consistency: number
}

class MotionService {
  private subscriptions: {
    accelerometer?: any
    gyroscope?: any
    deviceMotion?: any
    pedometer?: any
  } = {}

  private motionHistory: MotionData[] = []
  private beatTimings: number[] = []
  private lastBeatTime: number = 0
  private updateInterval: number = 100 // ms
  private onMotionUpdate?: (data: MotionData) => void
  private onBeatMatch?: (confidence: number) => void

  private initialized = false
  private sensorStatus: {
    accelerometer: boolean
    gyroscope: boolean
    deviceMotion: boolean
    isAvailable: boolean
  } = {
    accelerometer: false,
    gyroscope: false,
    deviceMotion: false,
    isAvailable: false,
  }

  private isRecording: boolean = false

  async initialize() {
    // Only initialize once
    if (this.initialized) {
      return this.sensorStatus
    }

    // Check sensor availability
    const [accelAvailable, gyroAvailable, motionAvailable] = await Promise.all([
      Accelerometer.isAvailableAsync(),
      Gyroscope.isAvailableAsync(),
      DeviceMotion.isAvailableAsync(),
    ])

    this.sensorStatus = {
      accelerometer: accelAvailable,
      gyroscope: gyroAvailable,
      deviceMotion: motionAvailable,
      isAvailable: accelAvailable || gyroAvailable || motionAvailable,
    }

    console.log('Motion sensors available:', this.sensorStatus)

    // Set update intervals
    if (accelAvailable) {
      Accelerometer.setUpdateInterval(this.updateInterval)
    }
    if (gyroAvailable) {
      Gyroscope.setUpdateInterval(this.updateInterval)
    }
    if (motionAvailable) {
      DeviceMotion.setUpdateInterval(this.updateInterval)
    }

    this.initialized = true
    return this.sensorStatus
  }

  startMotionTracking(onUpdate: (data: MotionData) => void, onBeat?: (confidence: number) => void) {
    // Stop any existing tracking first to prevent multiple subscriptions
    this.stopMotionTracking()

    this.onMotionUpdate = onUpdate
    this.onBeatMatch = onBeat
    this.isRecording = true
    this.motionHistory = []

    let lastAccel: AccelerometerMeasurement | null = null
    let lastGyro: GyroscopeMeasurement | null = null
    let lastMotion: DeviceMotionMeasurement | null = null

    // Use a throttle to prevent too frequent updates
    let lastProcessTime = 0
    const minProcessInterval = 100 // Minimum 100ms between updates

    // Start accelerometer
    const accelSubscription = Accelerometer.addListener(data => {
      lastAccel = data
      const now = Date.now()
      if (now - lastProcessTime >= minProcessInterval) {
        lastProcessTime = now
        this.processMotionData(lastAccel, lastGyro, lastMotion)
      }
    })
    this.subscriptions.accelerometer = accelSubscription

    // Start gyroscope (optional, might not be available on all devices)
    try {
      const gyroSubscription = Gyroscope.addListener(data => {
        lastGyro = data
      })
      this.subscriptions.gyroscope = gyroSubscription
    } catch (_error) {
      console.log('Gyroscope not available')
    }

    // Start device motion (combines accelerometer + gyroscope)
    try {
      const motionSubscription = DeviceMotion.addListener(data => {
        lastMotion = data
      })
      this.subscriptions.deviceMotion = motionSubscription
    } catch (_error) {
      console.log('DeviceMotion not available')
    }

    // Start pedometer for step detection (optional)
    this.startPedometer()
  }

  private async startPedometer() {
    const isAvailable = await Pedometer.isAvailableAsync()
    if (isAvailable) {
      const end = new Date()
      const start = new Date()
      start.setSeconds(end.getSeconds() - 1)

      this.subscriptions.pedometer = Pedometer.watchStepCount(result => {
        console.log('Steps:', result.steps)
      })
    }
  }

  private processMotionData(
    accel: AccelerometerMeasurement | null,
    gyro: GyroscopeMeasurement | null,
    motion: DeviceMotionMeasurement | null,
  ) {
    if (!accel) return

    const now = Date.now()

    // Calculate intensity from accelerometer
    const intensity = this.calculateIntensity(accel)

    // Detect beat/rhythm
    const bpm = this.detectBPM(intensity, now)

    const motionData: MotionData = {
      timestamp: now,
      accelerometer: accel,
      gyroscope: gyro || undefined,
      deviceMotion: motion || undefined,
      intensity,
      bpm,
      isValidMotion: true, // Always valid now - no anti-cheat
    }

    // Store in history (keep last 10 seconds)
    this.motionHistory.push(motionData)
    if (this.motionHistory.length > 100) {
      this.motionHistory.shift()
    }

    // Trigger callback
    if (this.onMotionUpdate) {
      this.onMotionUpdate(motionData)
    }

    // Check beat matching
    if (bpm && this.onBeatMatch) {
      const beatConfidence = this.calculateBeatConfidence()
      this.onBeatMatch(beatConfidence)
    }
  }

  private calculateIntensity(accel: AccelerometerMeasurement): number {
    // Calculate magnitude of acceleration vector
    const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2)

    // Normalize (1g = 9.81 m/s^2, but sensor reports in g's already)
    // Subtract gravity (1g) and normalize to 0-1 range
    const adjusted = Math.abs(magnitude - 1)
    return Math.min(adjusted * 2, 1) // Scale to 0-1, cap at 1
  }

  // Removed anti-cheat validation - no longer needed

  private analyzeMotionPattern(): MotionPattern {
    const intensities = this.motionHistory.map(m => m.intensity)

    // Calculate variance
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length
    const variance =
      intensities.reduce((sum, val) => sum + (val - avg) ** 2, 0) / intensities.length

    // Detect peaks for periodicity
    const peaks: number[] = []
    for (let i = 1; i < intensities.length - 1; i++) {
      if (
        intensities[i] > intensities[i - 1] &&
        intensities[i] > intensities[i + 1] &&
        intensities[i] > 0.3
      ) {
        peaks.push(i)
      }
    }

    // Calculate periodicity (consistency of peak intervals)
    let periodicity = 0
    if (peaks.length > 2) {
      const intervals = []
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const intervalVariance =
        intervals.reduce((sum, val) => sum + (val - avgInterval) ** 2, 0) / intervals.length
      periodicity = 1 / (1 + intervalVariance) // Higher = more periodic
    }

    return {
      variance,
      periodicity,
      peakCount: peaks.length,
      avgIntensity: avg,
      consistency: periodicity * (1 / (1 + variance)),
    }
  }

  private detectBPM(intensity: number, timestamp: number): number | undefined {
    // Detect beats (peaks in intensity)
    if (intensity > 0.4 && timestamp - this.lastBeatTime > 200) {
      // Min 200ms between beats
      this.beatTimings.push(timestamp)
      this.lastBeatTime = timestamp

      // Keep last 30 beats
      if (this.beatTimings.length > 30) {
        this.beatTimings.shift()
      }

      // Calculate BPM from beat intervals
      if (this.beatTimings.length >= 4) {
        const intervals: number[] = []
        for (let i = 1; i < this.beatTimings.length; i++) {
          intervals.push(this.beatTimings[i] - this.beatTimings[i - 1])
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const bpm = Math.round(60000 / avgInterval) // Convert to BPM
        return Math.min(Math.max(bpm, 60), 200) // Clamp to reasonable range
      }
    }
    return undefined
  }

  private calculateBeatConfidence(): number {
    if (this.beatTimings.length < 4) return 0

    // Calculate how consistent the beat intervals are
    const intervals: number[] = []
    for (let i = 1; i < this.beatTimings.length; i++) {
      intervals.push(this.beatTimings[i] - this.beatTimings[i - 1])
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance =
      intervals.reduce((sum, val) => sum + (val - avgInterval) ** 2, 0) / intervals.length

    // Lower variance = higher confidence
    const confidence = Math.max(0, 1 - variance / (avgInterval * avgInterval))
    return Math.min(confidence, 1)
  }

  async playBeatFeedback() {
    // Haptic feedback on beat
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  getMotionPattern(): MotionPattern {
    return this.analyzeMotionPattern()
  }

  // Check if motion tracking is currently active
  isTracking(): boolean {
    return this.isRecording
  }

  // Alias for stopMotionTracking for API compatibility
  stopTracking() {
    this.stopMotionTracking()
  }

  // Get current motion intensity (0-1 scale)
  getMotionIntensity(): number {
    if (this.motionHistory.length === 0) return 0
    const latest = this.motionHistory[this.motionHistory.length - 1]
    return latest?.intensity || 0
  }

  // Get the latest motion data sample
  getLatestMotionData(): MotionData | null {
    if (this.motionHistory.length === 0) return null
    return this.motionHistory[this.motionHistory.length - 1]
  }

  getSessionStats() {
    if (this.motionHistory.length === 0) return null

    const pattern = this.analyzeMotionPattern()

    return {
      sessionDuration: Date.now() - this.motionHistory[0].timestamp,
      avgIntensity: pattern.avgIntensity,
      peakCount: pattern.peakCount,
      consistency: pattern.consistency,
      estimatedCalories: this.estimateCalories(pattern.avgIntensity),
    }
  }

  private estimateCalories(avgIntensity: number): number {
    // Rough estimation: 5-10 calories per minute based on intensity
    const minutesActive = (this.motionHistory.length * (this.updateInterval / 1000)) / 60
    const caloriesPerMinute = 5 + avgIntensity * 5 // 5-10 cal/min
    return Math.round(minutesActive * caloriesPerMinute)
  }

  stopMotionTracking() {
    this.isRecording = false

    // Clean up all subscriptions
    Object.values(this.subscriptions).forEach(sub => {
      if (sub?.remove) sub.remove()
    })
    this.subscriptions = {}

    // Clear data
    this.motionHistory = []
    this.beatTimings = []

    // Don't reset initialized flag - sensors remain available
    // this.initialized = false;
  }
}

export default new MotionService()
