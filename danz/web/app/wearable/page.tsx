'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './wearable.css'

/* ── Component Data ── */
interface ComponentBlock {
  t: string
  rows: [string, string][]
}

interface ComponentData {
  name: string
  cat: string
  id: string
  color: string
  mesh: string
  prio: string
  desc: string
  blocks: ComponentBlock[]
  chips: string[]
}

const COMPONENTS: Record<string, ComponentData> = {
  soc: { name: 'nRF5340 SoC', cat: 'CORE PROCESSOR', id: 'PRIMARY SoC', color: '#7c3aed', mesh: 'nRF5340_SoC', prio: 'P0', desc: 'Dual-core ARM Cortex-M33 running Zephyr RTOS. App core at 128\u202fMHz handles sensor fusion and IBC protocol. Net core at 64\u202fMHz manages BLE 5.3 stack.', blocks: [{ t: 'Processor', rows: [['Architecture', 'ARM Cortex-M33'], ['App Core', '128 MHz'], ['Net Core', '64 MHz'], ['Flash', '1 MB + 256 KB'], ['RAM', '512 KB + 64 KB'], ['RTOS', 'Zephyr 3.x']] }, { t: 'Dev Stack', rows: [['IDE', 'Platform.IO'], ['SDK', 'nRF Connect'], ['Debugger', 'J-Link / SWD']] }], chips: ['ARM Cortex-M33', 'Zephyr', 'Platform.IO', 'nRF Connect'] },
  imu: { name: '6-Axis IMU', cat: 'MOTION SENSOR', id: 'FR-01', color: '#22c55e', mesh: 'IMU_ICM42688', prio: 'P0', desc: 'ICM-42688-P with 3-axis accelerometer + gyroscope. FIFO buffering at 50\u202fHz with interrupt-driven wakeup. This is the dance movement capture core.', blocks: [{ t: 'Accelerometer', rows: [['Range', '\u00b12g to \u00b116g'], ['Noise', '70 \u00b5g/\u221aHz'], ['Mode', 'Low-power']] }, { t: 'Gyroscope', rows: [['Range', '\u00b1250\u20132000 dps'], ['Noise', '3.8 mdps/\u221aHz'], ['Interface', 'SPI @ 24 MHz']] }, { t: 'Motion', rows: [['FIFO', '4 KB'], ['Sample Rate', '50 Hz'], ['Wake', 'Interrupt-driven']] }], chips: ['ICM-42688-P', 'SPI', 'FIFO'] },
  touch: { name: 'Capacitive Touch', cat: 'SKIN SENSOR', id: 'FR-02', color: '#94a3b8', mesh: 'CapTouch_Pad_1', prio: 'P0', desc: 'On-body detection and gesture recognition within 500\u202fms. Dual pads on skin side detect wear state and swipe gestures.', blocks: [{ t: 'Specs', rows: [['Type', 'Self-capacitive'], ['Pads', '2 (upper / lower)'], ['Response', '<500 ms'], ['Interface', 'nRF5340 COMP'], ['Gestures', 'Tap, Double-tap, Swipe']] }], chips: ['AT42QT', 'nRF5340 COMP'] },
  haptic: { name: 'Haptic Motor', cat: 'FEEDBACK', id: 'FR-08', color: '#8b5cf6', mesh: 'Haptic_LRA_Motor', prio: 'P1', desc: 'Linear Resonant Actuator with DRV2605L driver. 6 configurable patterns for dance beat sync, IBC confirmations, and alerts.', blocks: [{ t: 'Motor', rows: [['Type', 'LRA (Linear Resonant)'], ['Driver', 'DRV2605L'], ['Voltage', '1.8V RMS'], ['Patterns', '6 custom'], ['Response', '<15 ms']] }, { t: 'Use Cases', rows: [['Beat Sync', 'Rhythm haptics'], ['IBC Confirm', 'Bump feedback'], ['Alert', 'Low battery / SOS']] }], chips: ['DRV2605L', 'LRA', 'I2C'] },
  ble: { name: 'BLE 5.3 Radio', cat: 'WIRELESS', id: 'FR-04', color: '#06b6d4', mesh: 'BLE_53_Antenna', prio: 'P0', desc: 'Integrated BLE 5.3 on the net core. GATT server with custom dance movement service. LESC pairing. OTA firmware updates via SMP/mcumgr.', blocks: [{ t: 'Radio', rows: [['Version', 'BLE 5.3'], ['TX Power', '+3 dBm'], ['Range', '10+ meters'], ['Latency', '<100 ms']] }, { t: 'Services', rows: [['GATT', 'Dance Movement Service'], ['Pairing', 'LESC (Secure)'], ['OTA', 'SMP / mcumgr'], ['Profiles', 'HRS, DIS, Custom']] }], chips: ['BLE 5.3', 'GATT', 'LESC'] },
  nfc: { name: 'NFC-A Tag', cat: 'NEAR FIELD', id: 'FR-06', color: '#3b82f6', mesh: 'NFC_Antenna_Loop', prio: 'P1', desc: 'Passive NFC-A Type 2 Tag with PCB trace antenna. Tap your phone to pair, share identity, or verify dance achievements.', blocks: [{ t: 'NFC', rows: [['Type', 'NFC-A / Type 2'], ['Mode', 'Passive (no battery)'], ['Records', 'NDEF URL + App Launch'], ['Antenna', 'PCB trace loop'], ['Read Range', '~3 cm']] }], chips: ['NFC-A', 'NDEF'] },
  ibc: { name: 'Galvanic IBC', cat: 'INTRA-BODY', id: 'FR-07', color: '#ec4899', mesh: 'IBC_TX_Plus', prio: 'P1', desc: 'The magic. Differential galvanic coupling sends data through your skin at up to 1\u202fMbps. Fist-bump another wearer to exchange tokens. Your body IS the network.', blocks: [{ t: 'Physical', rows: [['Frequency', '100 kHz \u2013 2 MHz'], ['Data Rate', 'Up to 1 Mbps'], ['Modulation', 'ASK / FSK / OOK'], ['Electrodes', '4 (TX+/TX\u2212, RX+/RX\u2212)'], ['Electrode Material', 'Gold-plated Cu']] }, { t: 'Protocol', rows: [['Frame', 'Preamble + ID + Payload + CRC16'], ['Access', 'CSMA/CA'], ['Safety', '<1V peak, AC-coupled'], ['Current', '<100 \u00b5A through skin']] }], chips: ['Galvanic', 'Si5351', 'CRC16', 'CSMA/CA'] },
  temp: { name: 'AHT10 Sensor', cat: 'ENVIRONMENT', id: 'FR-03', color: '#f59e0b', mesh: 'AHT10_TempHumid', prio: 'P0', desc: 'Skin temperature and humidity monitoring every 10 seconds through micro-vents in the case. Detects workout intensity from skin temperature delta.', blocks: [{ t: 'Specs', rows: [['Temp Accuracy', '\u00b10.3\u00b0C'], ['Humidity', '\u00b12% RH'], ['Interface', 'I2C (0x38)'], ['Interval', '10 seconds'], ['Venting', '3x 0.8mm micro-holes']] }], chips: ['AHT10', 'I2C'] },
  led: { name: 'WS2812B RGB', cat: 'VISUAL OUTPUT', id: 'FR-09', color: '#ec4899', mesh: 'WS2812B_RGB_LED', prio: 'P1', desc: 'Addressable NeoPixel LED visible through the sapphire crystal top. Pulses with dance rhythm, shows battery state, and flashes pink for IBC events.', blocks: [{ t: 'LED', rows: [['Type', 'WS2812B NeoPixel'], ['Colors', '16.7M RGB'], ['Protocol', 'Single-wire @ 800 kHz'], ['Visible Through', 'Sapphire crystal top']] }, { t: 'Patterns', rows: [['Dance', 'Rhythm-synced pulse'], ['IBC', 'Pink flash on connect'], ['Battery', 'Green/Amber/Red'], ['Idle', 'Slow breathing pink']] }], chips: ['WS2812B', 'NeoPixel'] },
  usb: { name: 'USB-C Port', cat: 'WIRED I/O', id: 'FR-11', color: '#14b8a6', mesh: 'USB_C_Port', prio: 'P2', desc: 'USB 2.0 Full Speed at the bottom edge. Firmware DFU, serial debug console (CDC-ACM), and 5V/500mA charging. IP67-rated rubber plug.', blocks: [{ t: 'USB', rows: [['Speed', '12 Mbps (Full Speed)'], ['Connector', 'USB-C'], ['Classes', 'CDC-ACM + DFU'], ['Charging', '5V / 500mA'], ['Protection', 'IP67 rubber plug']] }], chips: ['USB 2.0', 'CDC-ACM'] },
  battery: { name: '200mAh LiPo', cat: 'POWER', id: 'NFR', color: '#ef4444', mesh: 'LiPo_200mAh', prio: 'P0', desc: 'Compact pouch-cell LiPo battery. 8+ hours of active dance tracking, 72 hours standby. Full charge in ~25 minutes via USB-C.', blocks: [{ t: 'Battery', rows: [['Chemistry', 'LiPo (3.7V nominal)'], ['Capacity', '200 mAh'], ['Active Runtime', '8+ hours'], ['Standby', '72 hours'], ['Charge Time', '~25 min @ 500mA']] }, { t: 'Protection', rows: [['OVP', 'Over-voltage @ 4.2V'], ['OCP', 'Over-current @ 600mA'], ['OTP', 'Over-temp @ 60\u00b0C'], ['UVP', 'Under-voltage @ 2.8V']] }], chips: ['LiPo', '200mAh', 'BMS'] },
  button: { name: 'User Button', cat: 'INPUT', id: 'FR-10', color: '#d4a017', mesh: 'User_Button', prio: 'P0', desc: 'Flush-mount tactile button on the right side. Short press cycles through modes (Dance / Social / Sleep). Long press (3s) toggles power.', blocks: [{ t: 'Button', rows: [['Type', 'Tactile, flush-mount'], ['GPIO', 'Active-low, 10k pull-up'], ['Debounce', '10 ms (software)'], ['Short Press', 'Mode cycle'], ['Long (3s)', 'Power toggle'], ['Feel', '0.5N actuation']] }], chips: ['GPIO', 'Tactile'] },
}

const SPEC_CARDS = [
  { icon: '\u2699', bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', h: 'Dual-Core SoC', p: 'ARM Cortex-M33', val: '128 MHz', color: 'var(--w-purple)' },
  { icon: '\u27F3', bg: 'linear-gradient(135deg,#22c55e,#16a34a)', h: '6-Axis Motion', p: 'Accel + Gyro FIFO', val: '50 Hz', color: 'var(--w-green)' },
  { icon: '\u26A1', bg: 'linear-gradient(135deg,#ec4899,#db2777)', h: 'Galvanic IBC', p: 'Body-as-network', val: '1 Mbps', color: 'var(--w-pink)' },
  { icon: '\uD83D\uDCF6', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', h: 'BLE 5.3', p: 'LESC + OTA DFU', val: '10m+', color: 'var(--w-cyan)' },
  { icon: '\uD83D\uDD0B', bg: 'linear-gradient(135deg,#ef4444,#dc2626)', h: '200mAh LiPo', p: 'USB-C charging', val: '8+ hrs', color: 'var(--w-red)' },
  { icon: '\uD83C\uDF21', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', h: 'AHT10 Sensor', p: 'Temp + Humidity', val: '\u00b10.3\u00b0C', color: 'var(--w-amber)' },
  { icon: '\uD83D\uDCA5', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', h: 'Haptic LRA', p: 'Beat sync feedback', val: '<15ms', color: '#8b5cf6' },
  { icon: '\uD83D\uDFE2', bg: 'linear-gradient(135deg,#ec4899,#a855f7)', h: 'RGB LED', p: 'Through sapphire top', val: '16.7M', color: 'var(--w-pink)' },
]

const FUN_MESSAGES = [
  'Your body is now a network node',
  'Dance mining activated',
  'Galvanic link established',
  'Rhythm detected: 128 BPM',
  'IBC handshake: success',
  '$DANZ tokens incoming...',
  'Sapphire crystal: pristine',
  'Haptic beat sync: locked',
  'Skin temp: optimal range',
  'BLE 5.3: connected',
  'NFC tap: identity verified',
]

const BAND_COLORS = [
  { hex: 0x1a1a2a, css: '#1a1a2a', title: 'Midnight' },
  { hex: 0xec4899, css: '#ec4899', title: 'DANZ Pink' },
  { hex: 0xa855f7, css: '#a855f7', title: 'Purple' },
  { hex: 0x06b6d4, css: '#06b6d4', title: 'Cyan' },
  { hex: 0x22c55e, css: '#22c55e', title: 'Green' },
  { hex: 0xf5f5f0, css: '#f5f5f0', title: 'Cloud' },
]

export default function WearablePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [polyCount, setPolyCount] = useState('-- tris')
  const [loading, setLoading] = useState(true)
  const [loadPct, setLoadPct] = useState('0%')

  const [activeComp, setActiveComp] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const [isExploded, setIsExploded] = useState(false)
  const [isWireframe, setIsWireframe] = useState(false)
  const [isXray, setIsXray] = useState(false)
  const [isRotating, setIsRotating] = useState(true)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [activeBandColor, setActiveBandColor] = useState(0)

  // Three.js refs that persist across renders
  const threeRef = useRef<{
    scene: any
    camera: any
    renderer: any
    controls: any
    modelGroup: any
    meshMap: Record<string, any>
    bandMaterial: any
    bandMesh: any
    particleSystem: any
    clock: any
    animationId: number
  }>({
    scene: null, camera: null, renderer: null, controls: null,
    modelGroup: null, meshMap: {}, bandMaterial: null, bandMesh: null,
    particleSystem: null, clock: null, animationId: 0,
  })

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimerRef.current)
    const el = toastRef.current
    if (!el) return
    el.textContent = msg
    el.classList.add('show')
    toastTimerRef.current = setTimeout(() => el.classList.remove('show'), 2200)
  }, [])

  const openPanel = useCallback((key: string) => {
    setActiveComp(key)
    setPanelOpen(true)
    // Highlight mesh
    const t = threeRef.current
    const comp = COMPONENTS[key]
    if (t.modelGroup && comp) {
      t.modelGroup.traverse((child: any) => {
        if (!child.isMesh || child.name === 'DANZ_Case') return
        const isTarget = child.name === comp.mesh || child.name.startsWith(comp.mesh?.split('_')[0] || '___')
        if (isTarget) {
          const mat = child.userData.originalMaterial?.clone() || child.material.clone()
          mat.emissive = { r: 1, g: 1, b: 1, isColor: true }
          mat.emissiveIntensity = 0.5
          child.material = mat
        } else {
          const mat = child.userData.originalMaterial?.clone() || child.material.clone()
          mat.transparent = true
          mat.opacity = 0.12
          child.material = mat
        }
      })
    }
  }, [])

  const closePanel = useCallback(() => {
    setActiveComp(null)
    setPanelOpen(false)
    // Reset highlight
    const t = threeRef.current
    if (t.modelGroup) {
      t.modelGroup.traverse((child: any) => {
        if (child.isMesh && child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial
        }
      })
    }
  }, [])

  // Initialize Three.js
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false

    const init = async () => {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

      if (disposed) return

      const t = threeRef.current
      const parent = canvas.parentElement!

      // Scene
      t.scene = new THREE.Scene()
      t.scene.background = new THREE.Color(0x030305)
      t.scene.fog = new THREE.FogExp2(0x030305, 6)

      // Camera
      t.camera = new THREE.PerspectiveCamera(36, parent.clientWidth / parent.clientHeight, 0.001, 100)
      t.camera.position.set(0.06, 0.05, 0.1)

      // Renderer
      t.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
      t.renderer.setSize(parent.clientWidth, parent.clientHeight)
      t.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      t.renderer.toneMapping = THREE.ACESFilmicToneMapping
      t.renderer.toneMappingExposure = 1.4
      t.renderer.shadowMap.enabled = true
      t.renderer.shadowMap.type = THREE.PCFSoftShadowMap

      // Controls
      t.controls = new OrbitControls(t.camera, canvas)
      t.controls.enableDamping = true
      t.controls.dampingFactor = 0.05
      t.controls.minDistance = 0.025
      t.controls.maxDistance = 0.3
      t.controls.autoRotate = true
      t.controls.autoRotateSpeed = 0.8
      t.controls.target.set(0, 0, 0)
      t.controls.maxPolarAngle = Math.PI * 0.85

      // Lighting
      const ambient = new THREE.AmbientLight(0x303045, 0.4)
      t.scene.add(ambient)

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(0.1, 0.12, 0.08)
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(1024, 1024)
      keyLight.shadow.camera.near = 0.01
      keyLight.shadow.camera.far = 0.5
      keyLight.shadow.radius = 3
      t.scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0xec4899, 0.4)
      fillLight.position.set(-0.08, 0.05, -0.05)
      t.scene.add(fillLight)

      const rimLight = new THREE.PointLight(0x06b6d4, 0.5, 0.3)
      rimLight.position.set(-0.04, -0.03, 0.08)
      t.scene.add(rimLight)

      const underLight = new THREE.PointLight(0xa855f7, 0.25, 0.2)
      underLight.position.set(0, -0.06, -0.02)
      t.scene.add(underLight)

      const topAccent = new THREE.PointLight(0xec4899, 0.3, 0.15)
      topAccent.position.set(0, 0.08, 0)
      t.scene.add(topAccent)

      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(0.4, 0.4)
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x050508, roughness: 0.85, metalness: 0.1,
        transparent: true, opacity: 0.6,
      })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -0.035
      ground.receiveShadow = true
      t.scene.add(ground)

      // Grid
      const grid = new THREE.GridHelper(0.3, 40, 0x12121e, 0x0a0a12)
      grid.position.y = -0.034
      t.scene.add(grid)

      // Particles
      const count = 200
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const pinkC = new THREE.Color(0xec4899)
      const purpleC = new THREE.Color(0xa855f7)
      const cyanC = new THREE.Color(0x06b6d4)
      const colorOptions = [pinkC, purpleC, cyanC]

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 0.3
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3
        const c = colorOptions[Math.floor(Math.random() * 3)]
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }
      const particleGeo = new THREE.BufferGeometry()
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const particleMat = new THREE.PointsMaterial({
        size: 0.0006, vertexColors: true, transparent: true,
        opacity: 0.35, blending: THREE.AdditiveBlending,
        depthWrite: false, sizeAttenuation: true,
      })
      t.particleSystem = new THREE.Points(particleGeo, particleMat)
      t.scene.add(t.particleSystem)

      // Bracelet band
      const wristRadius = 0.027
      const bandWidth = 0.011
      const bandThick = 0.0014
      const segments = 128
      const arcAngle = Math.PI * 1.25
      const startAngle = Math.PI * 0.55

      t.bandMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a2a, roughness: 0.65, metalness: 0.05,
        clearcoat: 0.3, clearcoatRoughness: 0.4,
      })

      const bandShape = new THREE.Shape()
      bandShape.moveTo(-bandWidth, -bandThick / 2)
      bandShape.lineTo(bandWidth, -bandThick / 2)
      bandShape.quadraticCurveTo(bandWidth + 0.0005, 0, bandWidth, bandThick / 2)
      bandShape.lineTo(-bandWidth, bandThick / 2)
      bandShape.quadraticCurveTo(-bandWidth - 0.0005, 0, -bandWidth, -bandThick / 2)

      const points: InstanceType<typeof THREE.Vector3>[] = []
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (i / segments) * arcAngle
        points.push(new THREE.Vector3(Math.cos(angle) * wristRadius, Math.sin(angle) * wristRadius, 0))
      }
      const curve = new THREE.CatmullRomCurve3(points, false)
      const bandGeo = new THREE.ExtrudeGeometry(bandShape, { steps: segments, extrudePath: curve })
      t.bandMesh = new THREE.Mesh(bandGeo, t.bandMaterial)
      t.bandMesh.castShadow = true
      t.bandMesh.receiveShadow = true
      t.scene.add(t.bandMesh)

      // Band grooves
      const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 0.9, metalness: 0 })
      for (let i = 1; i < 18; i++) {
        const tt = i / 18
        const angle = startAngle + tt * arcAngle
        const x = Math.cos(angle) * (wristRadius + bandThick * 0.3)
        const y = Math.sin(angle) * (wristRadius + bandThick * 0.3)
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.0002, 0.0002, bandWidth * 1.6), grooveMat)
        groove.position.set(x, y, 0)
        groove.rotation.z = angle + Math.PI / 2
        t.scene.add(groove)
      }

      // Clasp
      const claspGroup = new THREE.Group()
      const claspMat = new THREE.MeshPhysicalMaterial({ color: 0x8a8a9a, metalness: 0.9, roughness: 0.2, clearcoat: 0.5 })
      const claspBody = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, bandWidth * 1.8), claspMat)
      const claspBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.001, 0.001, 0.002, 16),
        new THREE.MeshPhysicalMaterial({ color: 0xec4899, metalness: 0.7, roughness: 0.15 }),
      )
      claspBtn.rotation.x = Math.PI / 2
      claspBtn.position.set(0, 0.002, 0)
      claspGroup.add(claspBody, claspBtn)
      const claspAngle = startAngle + arcAngle + 0.08
      claspGroup.position.set(Math.cos(claspAngle) * wristRadius, Math.sin(claspAngle) * wristRadius, 0)
      claspGroup.rotation.z = claspAngle + Math.PI / 2
      t.scene.add(claspGroup)

      // Load GLB model
      new GLTFLoader().load(
        '/wearable/flowbond-wearable-final.glb',
        (gltf) => {
          if (disposed) return
          t.modelGroup = gltf.scene
          const box = new THREE.Box3().setFromObject(t.modelGroup)
          const center = box.getCenter(new THREE.Vector3())
          t.modelGroup.position.sub(center)
          t.scene.add(t.modelGroup)

          let totalTris = 0
          t.modelGroup.traverse((child: any) => {
            if (child.isMesh) {
              t.meshMap[child.name] = child
              child.userData.originalMaterial = child.material
              child.userData.originalPosition = child.position.clone()
              child.castShadow = true
              child.receiveShadow = true
              if (child.geometry.index) totalTris += child.geometry.index.count / 3
            }
          })

          // Semi-transparent case
          const caseMesh = t.meshMap['DANZ_Case']
          if (caseMesh) {
            const mat = new THREE.MeshPhysicalMaterial({
              color: 0xd94c8a, metalness: 0.7, roughness: 0.15,
              transparent: true, opacity: 0.28, transmission: 0.6,
              thickness: 0.5, ior: 1.5, clearcoat: 1.0,
              clearcoatRoughness: 0.05, side: THREE.DoubleSide,
              depthWrite: false, envMapIntensity: 1.5,
            })
            caseMesh.material = mat
            caseMesh.userData.originalMaterial = mat
            caseMesh.renderOrder = 999
          }

          setPolyCount(`${Math.round(totalTris).toLocaleString()} tris`)
          setLoading(false)
        },
        (p) => {
          if (p.total > 0) setLoadPct(`${Math.round((p.loaded / p.total) * 100)}%`)
        },
        (err) => {
          console.error('GLB load error:', err)
          setLoadPct('ERR')
        },
      )

      // Raycaster for click-to-select
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      let pointerDown = new THREE.Vector2()

      const onPointerDown = (e: PointerEvent) => pointerDown.set(e.clientX, e.clientY)
      const onPointerUp = (e: PointerEvent) => {
        const dx = e.clientX - pointerDown.x
        const dy = e.clientY - pointerDown.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
        if (!t.modelGroup) return
        const rect = canvas.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, t.camera)
        const hits = raycaster.intersectObjects(t.modelGroup.children, true)
        if (hits.length) {
          const name = hits[0].object.name
          for (const [k, v] of Object.entries(COMPONENTS)) {
            if (v.mesh === name || name.startsWith(v.mesh?.split('_')[0] || '___')) {
              // Dispatch custom event so React state updates
              canvas.dispatchEvent(new CustomEvent('select-component', { detail: k }))
              return
            }
          }
        }
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointerup', onPointerUp)

      // Resize
      const onResize = () => {
        t.camera.aspect = parent.clientWidth / parent.clientHeight
        t.camera.updateProjectionMatrix()
        t.renderer.setSize(parent.clientWidth, parent.clientHeight)
      }
      window.addEventListener('resize', onResize)

      // Animation loop
      t.clock = new THREE.Clock()
      const animate = () => {
        if (disposed) return
        t.animationId = requestAnimationFrame(animate)
        const time = t.clock.getElapsedTime()
        t.controls.update()

        // Particle float
        if (t.particleSystem) {
          const pos = t.particleSystem.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.000003
            pos.array[i * 3] += Math.cos(time * 0.3 + i * 0.7) * 0.000002
          }
          pos.needsUpdate = true
          t.particleSystem.rotation.y = time * 0.02
        }

        // LED glow
        const ledMesh = t.meshMap['WS2812B_RGB_LED']
        if (ledMesh?.material?.emissiveIntensity !== undefined) {
          ledMesh.material.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.5
        }

        t.renderer.render(t.scene, t.camera)
      }
      animate()

      // Cleanup refs
      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('resize', onResize)
      }
    }

    init()

    return () => {
      disposed = true
      const t = threeRef.current
      if (t.animationId) cancelAnimationFrame(t.animationId)
      if (t.renderer) t.renderer.dispose()
    }
  }, [])

  // Listen for 3D click events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail
      openPanel(key)
    }
    canvas.addEventListener('select-component', handler)
    return () => canvas.removeEventListener('select-component', handler)
  }, [openPanel])

  // Random fun toasts
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeComp && Math.random() < 0.3) {
        toast(FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)])
      }
    }, 12000)
    return () => clearInterval(interval)
  }, [activeComp, toast])

  // First toast after load
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => toast(FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)]), 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, toast])

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) e.target.classList.add('vis') } },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' },
    )
    document.querySelectorAll('.w-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [loading])

  // Escape to close panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closePanel])

  // Mode handlers
  const handleExplode = () => {
    const next = !isExploded
    setIsExploded(next)
    const t = threeRef.current
    if (!t.modelGroup) return
    const center = { x: 0, y: 0, z: 0 }
    t.modelGroup.traverse((child: any) => {
      if (!child.isMesh) return
      const origPos = child.userData.originalPosition
      if (!origPos) return
      if (next) {
        const dir = origPos.clone().sub(center).normalize()
        const dist = child.name === 'DANZ_Case' ? 0.012 : 0.008
        child.position.copy(origPos.clone().add(dir.multiplyScalar(dist)))
      } else {
        child.position.copy(origPos)
      }
    })
    toast(next ? 'Exploded view: components separated' : 'Assembled view')
  }

  const handleWireframe = () => {
    const next = !isWireframe
    setIsWireframe(next)
    const t = threeRef.current
    if (t.modelGroup) {
      t.modelGroup.traverse((child: any) => {
        if (child.isMesh) child.material.wireframe = next
      })
    }
    if (t.bandMesh) t.bandMesh.material.wireframe = next
    toast(next ? 'Wireframe mode' : 'Solid mode')
  }

  const handleXray = () => {
    const next = !isXray
    setIsXray(next)
    const t = threeRef.current
    if (!t.modelGroup) return
    const caseMesh = t.meshMap['DANZ_Case']
    if (caseMesh) {
      caseMesh.material.opacity = next ? 0.06 : 0.28
      caseMesh.material.transmission = next ? 0.95 : 0.6
    }
    t.modelGroup.traverse((child: any) => {
      if (!child.isMesh || child.name === 'DANZ_Case') return
      if (next) {
        const mat = child.userData.originalMaterial?.clone() || child.material.clone()
        mat.emissive = mat.color?.clone() || { r: 1, g: 1, b: 1, isColor: true }
        mat.emissiveIntensity = 0.6
        child.material = mat
      } else if (child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial
      }
    })
    toast(next ? 'X-Ray: see through the case' : 'Normal view')
  }

  const handleRotate = () => {
    const next = !isRotating
    setIsRotating(next)
    const t = threeRef.current
    if (t.controls) t.controls.autoRotate = next
    toast(next ? 'Auto-rotate on' : 'Auto-rotate off')
  }

  const handleBandColor = (index: number) => {
    setActiveBandColor(index)
    const t = threeRef.current
    if (t.bandMaterial) t.bandMaterial.color.setHex(BAND_COLORS[index].hex)
    toast(`Band color: ${BAND_COLORS[index].title}`)
  }

  const comp = activeComp ? COMPONENTS[activeComp] : null

  return (
    <div className="wearable-page">
      {/* Top Bar */}
      <nav className="w-topbar">
        <div className="w-topbar-left">
          <span className="w-topbar-brand">DANZ</span>
          <span className="w-topbar-sep" />
          <span className="w-topbar-label">Wearable Bracelet</span>
        </div>
        <div className="w-topbar-right">
          <a href="/wearable-platform.html" className="w-topbar-chip w-topbar-link">Hardware Specs &rarr;</a>
          <span className="w-topbar-chip">{polyCount}</span>
        </div>
      </nav>

      {/* 3D Viewport */}
      <section className="w-viewport">
        <canvas ref={canvasRef} className="w-viewer-canvas" />
        <div className={`w-loader ${loading ? '' : 'gone'}`}>
          <div className="w-loader-ring" />
          <div className="w-loader-pct">{loadPct}</div>
          <div className="w-loader-label">Loading Bracelet</div>
        </div>
        <div className="w-hero-overlay">
          <div className="w-hero-badge"><span className="w-hero-badge-dot" />Interactive 3D</div>
          <h1 className="w-hero-title">Wear Your<br /><em>Rhythm.</em></h1>
          <p className="w-hero-desc">12 subsystems. 4 IBC electrodes. Your body becomes the network. The DANZ bracelet is precision-engineered wearable hardware that tracks, connects, and rewards movement.</p>
          <div className="w-hero-metrics">
            <div><div className="w-metric-val">42mm</div><div className="w-metric-label">Case Height</div></div>
            <div><div className="w-metric-val">22mm</div><div className="w-metric-label">Band Width</div></div>
            <div><div className="w-metric-val">10mm</div><div className="w-metric-label">Profile</div></div>
            <div><div className="w-metric-val">38g</div><div className="w-metric-label">Weight</div></div>
          </div>
        </div>
      </section>

      {/* Mode Controls */}
      <div className="w-modes">
        <button className={`w-mode-btn ${isExploded ? 'on' : ''}`} onClick={handleExplode} title="Explode View">
          <span className="w-mode-tip">EXPLODE</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8L3 3M16 8l5-5M8 16l-5 5M16 16l5 5" /><rect x="8" y="8" width="8" height="8" rx="1" /></svg>
        </button>
        <button className={`w-mode-btn ${isWireframe ? 'on' : ''}`} onClick={handleWireframe} title="Wireframe">
          <span className="w-mode-tip">WIREFRAME</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 6v8l-10 6L2 16V8l10-6z" /><path d="M12 22V10M2 8l10 4 10-4" /></svg>
        </button>
        <button className={`w-mode-btn ${isXray ? 'on' : ''}`} onClick={handleXray} title="X-Ray">
          <span className="w-mode-tip">X-RAY</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 000 20" /><path d="M2 12h20" /></svg>
        </button>
        <button className={`w-mode-btn ${isRotating ? 'on' : ''}`} onClick={handleRotate} title="Auto-Rotate">
          <span className="w-mode-tip">ROTATE</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.22-8.56" /><polyline points="21 3 21 9 15 9" /></svg>
        </button>
        <button className={`w-mode-btn ${colorPickerOpen ? 'on' : ''}`} onClick={() => setColorPickerOpen(!colorPickerOpen)} title="Colors">
          <span className="w-mode-tip">COLORS</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="2" fill="currentColor" /><circle cx="8" cy="14" r="2" fill="currentColor" /><circle cx="16" cy="14" r="2" fill="currentColor" /></svg>
        </button>
      </div>

      {/* Color Picker */}
      <div className={`w-color-picker ${colorPickerOpen ? 'on' : ''}`}>
        <span className="w-color-label">BAND</span>
        {BAND_COLORS.map((c, i) => (
          <button
            key={c.title}
            className={`w-color-swatch ${activeBandColor === i ? 'on' : ''}`}
            style={{ background: c.css }}
            title={c.title}
            onClick={() => handleBandColor(i)}
          />
        ))}
      </div>

      {/* Component Dock */}
      <div className="w-dock">
        {Object.entries(COMPONENTS).map(([key, c]) => (
          <button
            key={key}
            className={`w-dock-btn ${activeComp === key ? 'on' : ''}`}
            onClick={() => activeComp === key ? closePanel() : openPanel(key)}
          >
            <span className="w-dock-dot" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      <div className={`w-panel ${panelOpen ? 'open' : ''}`}>
        {comp && (
          <>
            <div className="w-panel-head">
              <button className="w-panel-x" onClick={closePanel}>&times;</button>
              <div className="w-panel-cat">{comp.cat}</div>
              <div className="w-panel-title">{comp.name}</div>
              <div className="w-panel-id">{comp.id}</div>
            </div>
            <div className="w-panel-body">
              <p className="w-panel-desc">{comp.desc}</p>
              {comp.prio && (
                <div className={`w-prio w-prio-${comp.prio.toLowerCase()}`}>{comp.prio}</div>
              )}
              {comp.blocks.map((block) => (
                <div key={block.t} className="w-sblock">
                  <div className="w-sblock-title">{block.t}</div>
                  {block.rows.map(([k, v]) => (
                    <div key={k} className="w-srow">
                      <span className="w-srow-k">{k}</span>
                      <span className="w-srow-v">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
              {comp.chips.length > 0 && (
                <div className="w-sblock">
                  <div className="w-sblock-title">Parts</div>
                  <div className="w-chips">
                    {comp.chips.map((ch) => (
                      <span key={ch} className="w-chip">{ch}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      <div ref={toastRef} className="w-toast" />

      {/* Scroll Content */}
      <div className="w-sections">
        <section className="w-sec">
          <div className="w-sec-head">
            <h2>Precision <em>Engineering</em></h2>
            <p>Every millimeter is accounted for. 12 subsystems packed into a bracelet you&apos;d actually want to wear.</p>
          </div>
          <div className="w-spec-grid">
            {SPEC_CARDS.map((c) => (
              <div key={c.h} className="w-spec-card w-reveal">
                <div className="w-spec-icon" style={{ background: c.bg }}>{c.icon}</div>
                <h3>{c.h}</h3>
                <p>{c.p}</p>
                <span className="w-spec-val" style={{ color: c.color }}>{c.val}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="w-sec">
          <div className="w-fun-banner w-reveal">
            <div className="w-fun-emoji">{'\uD83D\uDC83'}</div>
            <h3>Dance to Earn. Literally.</h3>
            <p>The 6-axis IMU samples your movement 50 times per second. Every salsa spin, every hip-hop pop, every bachata step is captured, verified on-chain, and rewarded with $DANZ tokens. Your body is the miner.</p>
          </div>
        </section>

        <section className="w-sec">
          <div className="w-sec-head">
            <h2>Physical <em>Details</em></h2>
            <p>Designed for comfort and durability across every dance style</p>
          </div>
          <div className="w-phys-grid">
            <div className="w-phys-card w-reveal">
              <h3><span style={{ fontSize: 20 }}>{'\uD83D\uDCD0'}</span> Dimensions</h3>
              <div className="w-phys-row"><span className="w-phys-k">Case Height</span><span className="w-phys-v" style={{ color: 'var(--w-pink)' }}>42.0 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Case Width</span><span className="w-phys-v" style={{ color: 'var(--w-pink)' }}>22.2 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Case Depth</span><span className="w-phys-v" style={{ color: 'var(--w-pink)' }}>10.0 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Band Width</span><span className="w-phys-v">22.0 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Band Thickness</span><span className="w-phys-v">2.8 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Wrist Range</span><span className="w-phys-v">145 - 210 mm</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Total Weight</span><span className="w-phys-v" style={{ color: 'var(--w-cyan)' }}>~38 g</span></div>
            </div>
            <div className="w-phys-card w-reveal">
              <h3><span style={{ fontSize: 20 }}>{'\u2699'}</span> Materials</h3>
              <div className="w-phys-row"><span className="w-phys-k">Case</span><span className="w-phys-v">Anodized Al 6061-T6</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Band</span><span className="w-phys-v">Medical-grade Silicone</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Electrodes</span><span className="w-phys-v">Gold-plated Copper</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Glass</span><span className="w-phys-v">Sapphire Crystal (Top)</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Clasp</span><span className="w-phys-v">Titanium Quick-Release</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Water Rating</span><span className="w-phys-v" style={{ color: 'var(--w-cyan)' }}>IP67</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Finish</span><span className="w-phys-v">Micro-blasted Matte</span></div>
            </div>
            <div className="w-phys-card w-reveal">
              <h3><span style={{ fontSize: 20 }}>{'\u26A1'}</span> Power</h3>
              <div className="w-phys-row"><span className="w-phys-k">Battery</span><span className="w-phys-v">200 mAh LiPo</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Runtime</span><span className="w-phys-v" style={{ color: 'var(--w-green)' }}>8+ hours active</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Standby</span><span className="w-phys-v" style={{ color: 'var(--w-green)' }}>72 hours</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Charging</span><span className="w-phys-v">USB-C (5V / 500mA)</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Full Charge</span><span className="w-phys-v">~25 minutes</span></div>
              <div className="w-phys-row"><span className="w-phys-k">SoC Sleep</span><span className="w-phys-v">2.5 uA</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Protection</span><span className="w-phys-v">OVP / OCP / OTP</span></div>
            </div>
            <div className="w-phys-card w-reveal">
              <h3><span style={{ fontSize: 20 }}>{'\uD83D\uDCE1'}</span> Connectivity</h3>
              <div className="w-phys-row"><span className="w-phys-k">BLE</span><span className="w-phys-v" style={{ color: 'var(--w-cyan)' }}>5.3 LESC</span></div>
              <div className="w-phys-row"><span className="w-phys-k">NFC</span><span className="w-phys-v">Type 2 Tag (passive)</span></div>
              <div className="w-phys-row"><span className="w-phys-k">IBC</span><span className="w-phys-v" style={{ color: 'var(--w-pink)' }}>Galvanic 1 Mbps</span></div>
              <div className="w-phys-row"><span className="w-phys-k">USB</span><span className="w-phys-v">2.0 FS (12 Mbps)</span></div>
              <div className="w-phys-row"><span className="w-phys-k">OTA DFU</span><span className="w-phys-v">SMP / mcumgr</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Debug</span><span className="w-phys-v">CDC-ACM Serial</span></div>
              <div className="w-phys-row"><span className="w-phys-k">Range (BLE)</span><span className="w-phys-v">10+ meters</span></div>
            </div>
          </div>
        </section>

        <section className="w-sec">
          <div className="w-fun-banner w-reveal">
            <div className="w-fun-emoji">{'\uD83E\uDD1D'}</div>
            <h3>Bump to Connect</h3>
            <p>Fist-bump another DANZ wearer and your bracelets exchange identity tokens through your bodies using galvanic IBC. No Bluetooth pairing screens. No QR codes. Just touch. The future of social connection is literally at your fingertips.</p>
          </div>
        </section>
      </div>

      <footer className="w-foot">
        <div className="w-foot-logo">DANZ</div>
        <p>&copy; 2026 FlowBond. All rights reserved.</p>
        <p className="w-foot-tech">PRECISION WEARABLE HARDWARE &middot; nRF5340 &middot; GALVANIC IBC &middot; DANCE-TO-EARN</p>
      </footer>
    </div>
  )
}
