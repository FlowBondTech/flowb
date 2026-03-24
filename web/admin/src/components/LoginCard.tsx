import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

interface LoginCardProps {
  onLogin: (email: string, code: string) => Promise<void>
  onSendOtp: (email: string) => Promise<void>
}

export function LoginCard({ onLogin, onSendOtp }: LoginCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useThreeBackground(canvasRef)

  const handleSendOtp = useCallback(async () => {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await onSendOtp(email)
      setStep('otp')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }, [email, onSendOtp])

  const handleVerify = useCallback(async (code?: string) => {
    const finalCode = code || otp.join('')
    if (finalCode.length !== 6) return
    setLoading(true)
    setError('')
    try {
      await onLogin(email, finalCode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [email, otp, onLogin])

  function handleOtpInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    if (index === 5 && digit) handleVerify(next.join(''))
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
      const next = [...otp]
      next[index - 1] = ''
      setOtp(next)
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    const next = [...otp]
    paste.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    if (paste.length === 6) handleVerify(paste)
    else otpRefs.current[Math.min(paste.length, 5)]?.focus()
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="relative z-10" style={{ perspective: '1200px' }}>
        <div
          className="w-[340px] h-[400px] relative"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
            style={{ backfaceVisibility: 'hidden' }}
            onClick={() => {
              setFlipped(true)
              setTimeout(() => emailRef.current?.focus(), 500)
            }}
          >
            <img
              src="https://flowb.me/flowb.png"
              alt="FlowB"
              className="w-44 h-44 rounded-[32px] shadow-[0_0_80px_rgba(99,102,241,0.3),0_0_160px_rgba(168,85,247,0.15)] hover:scale-105 transition-transform duration-300"
            />
            <div className="mt-7 text-xs font-semibold text-[var(--color-muted-foreground)]/40 uppercase tracking-[2px] animate-pulse">
              tap to enter
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center glass rounded-xl px-7 py-8"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-xl font-extrabold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-purple)] bg-clip-text text-transparent mb-1">
              FlowB Admin
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-6">
              Sign in with your email
            </div>

            {step === 'email' ? (
              <div className="w-full">
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-3 text-sm text-center bg-white/[0.04] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  className="w-full mt-3 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            ) : (
              <div className="w-full">
                <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Enter the 6-digit code sent to</div>
                <div className="text-sm text-[var(--color-primary)] font-semibold mb-3">{email}</div>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold bg-white/[0.04] border border-[var(--color-border)] rounded-lg text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleVerify()}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full mt-4 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            )}

            {error && <p className="text-xs text-[var(--color-destructive)] mt-2 text-center">{error}</p>}

            <button
              onClick={() => { setFlipped(false); setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }}
              className="mt-4 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] bg-transparent border-none cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function useThreeBackground(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x06060a, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 5)

    // Particles
    const count = 600
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 2
      const c = new THREE.Color().setHSL(0.66 + Math.random() * 0.15, 0.6, 0.4 + Math.random() * 0.3)
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    const particles = new THREE.Points(geo, mat)
    scene.add(particles)

    // Icosahedrons
    const icoGeo = new THREE.IcosahedronGeometry(0.3, 1)
    const wireGeo = new THREE.IcosahedronGeometry(0.35, 1)
    const accent = new THREE.Color(0x6366f1)
    const purple = new THREE.Color(0xa855f7)
    const icoGroup = new THREE.Group()
    const shapesData: { angle: number; r: number; speed: number; yOff: number }[] = []
    for (let i = 0; i < 6; i++) {
      const color = i % 2 === 0 ? accent : purple
      const mesh = new THREE.Mesh(icoGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08 }))
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(wireGeo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 }))
      const angle = (i / 6) * Math.PI * 2
      const r = 2.5 + Math.random() * 1.5
      mesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.6, -1 + Math.random() * 2)
      wire.position.copy(mesh.position)
      shapesData.push({ angle, r, speed: 0.15 + Math.random() * 0.2, yOff: Math.random() * Math.PI })
      icoGroup.add(mesh, wire)
    }
    scene.add(icoGroup)

    // Ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.008, 8, 100)
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.2 }))
    ring.rotation.x = Math.PI / 2.5
    scene.add(ring)

    let mouseX = 0, mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    let raf: number
    function animate(t: number) {
      raf = requestAnimationFrame(animate)
      const time = t * 0.001
      const pos = geo.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(time + i) * 0.0005
        pos[i * 3] += Math.cos(time + i * 0.5) * 0.0003
      }
      geo.attributes.position.needsUpdate = true
      particles.rotation.y = time * 0.02

      icoGroup.children.forEach((child, ci) => {
        const d = shapesData[Math.floor(ci / 2)]
        if (!d) return
        const a = d.angle + time * d.speed * 0.3
        child.position.x = Math.cos(a) * d.r
        child.position.y = Math.sin(a) * d.r * 0.6 + Math.sin(time * 0.5 + d.yOff) * 0.3
        child.rotation.x = time * 0.3
        child.rotation.y = time * 0.5
      })

      ring.rotation.z = time * 0.1
      camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.02
      camera.position.y += (-mouseY * 0.3 - camera.position.y) * 0.02
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate(0)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [canvasRef])
}
