# Version 5: Enhanced Neon

Premium landing page with advanced 3D effects, particle systems, and modern neon aesthetics.

## Overview

| Property | Value |
|----------|-------|
| **Theme** | Enhanced Neon / Premium |
| **Primary Color** | Purple (#8B5CF6) |
| **Secondary Color** | Pink (#EC4899) |
| **Style** | Premium, High-impact |
| **Animation** | 3D transforms, particles |

## Visual Design

### Color Palette

```css
:root {
  --primary: #8B5CF6;
  --primary-light: #A78BFA;
  --primary-dark: #7C3AED;
  --secondary: #EC4899;
  --secondary-light: #F472B6;
  --accent: #06B6D4;
  --dark: #0A0A0F;
  --dark-elevated: #121218;
  --dark-card: #1A1A24;
  --glow-primary: 0 0 20px var(--primary), 0 0 60px rgba(139, 92, 246, 0.3);
  --glow-secondary: 0 0 20px var(--secondary), 0 0 60px rgba(236, 72, 153, 0.3);
  --gradient-hero: radial-gradient(
    ellipse at 50% 0%,
    rgba(139, 92, 246, 0.15) 0%,
    transparent 50%
  );
}
```

### Typography

```css
body {
  font-family: 'Inter', -apple-system, sans-serif;
}

h1 {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## Sections

### Hero Section

3D animated hero with particle background and floating elements.

```html
<section class="hero">
  <!-- Particle Canvas -->
  <canvas id="particles"></canvas>

  <!-- Floating Orbs -->
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>

  <div class="hero-content">
    <span class="hero-badge">
      <span class="badge-dot"></span>
      Now in Public Beta
    </span>

    <h1>
      The Future of
      <span class="gradient-text">Dance</span>
      is Here
    </h1>

    <p class="hero-description">
      Transform your movement into digital value with AI-powered
      motion tracking and blockchain rewards.
    </p>

    <div class="hero-cta">
      <button class="btn-glow">
        <span>Get Started</span>
        <div class="btn-shine"></div>
      </button>
      <button class="btn-ghost">
        <span>Watch Demo</span>
        <svg><!-- Play icon --></svg>
      </button>
    </div>

    <div class="hero-stats">
      <div class="stat-item">
        <span class="stat-value">50K+</span>
        <span class="stat-label">Dancers</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">$2M+</span>
        <span class="stat-label">Rewards</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">99.9%</span>
        <span class="stat-label">Uptime</span>
      </div>
    </div>
  </div>

  <!-- 3D Phone Mockup -->
  <div class="hero-visual">
    <div class="phone-mockup">
      <div class="phone-screen">
        <img src="app-preview.png" alt="DANZ App" />
      </div>
      <div class="phone-glow"></div>
    </div>
  </div>
</section>
```

### Features Section

Bento grid layout with glassmorphism cards.

```html
<section class="features">
  <div class="section-header">
    <span class="section-badge">Features</span>
    <h2>Everything you need to <span class="gradient-text">earn while you dance</span></h2>
  </div>

  <div class="bento-grid">
    <div class="bento-card bento-large glass-card">
      <div class="card-icon-wrap">
        <div class="card-icon">🎯</div>
      </div>
      <h3>AI Motion Tracking</h3>
      <p>Real-time movement analysis powered by advanced machine learning algorithms.</p>
      <div class="card-visual">
        <div class="motion-lines"></div>
      </div>
    </div>

    <div class="bento-card glass-card">
      <div class="card-icon">💎</div>
      <h3>Token Rewards</h3>
      <p>Earn DANZ tokens for every dance session.</p>
    </div>

    <div class="bento-card glass-card">
      <div class="card-icon">🌐</div>
      <h3>Global Community</h3>
      <p>Connect with dancers worldwide.</p>
    </div>

    <div class="bento-card bento-wide glass-card">
      <div class="card-icon">🏆</div>
      <h3>Achievements & Leaderboards</h3>
      <p>Compete, earn badges, and climb the global rankings.</p>
    </div>
  </div>
</section>
```

## CSS Highlights

### Floating Orbs

```css
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: var(--primary);
  opacity: 0.15;
  top: -200px;
  left: -100px;
  animation: float 20s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--secondary);
  opacity: 0.1;
  bottom: 0;
  right: -100px;
  animation: float 15s ease-in-out infinite reverse;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: var(--accent);
  opacity: 0.1;
  top: 50%;
  right: 20%;
  animation: float 18s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(20px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(30px, 10px) scale(1.02); }
}
```

### Glow Button

```css
.btn-glow {
  position: relative;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-glow::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  filter: blur(20px);
  opacity: 0.5;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.btn-glow:hover::before {
  opacity: 0.8;
}

.btn-glow:hover {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}
```

### Glass Card

```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 32px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-8px);
  box-shadow:
    0 20px 60px rgba(139, 92, 246, 0.15),
    0 0 0 1px rgba(139, 92, 246, 0.1);
}

.card-icon-wrap {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: var(--glow-primary);
}

.card-icon {
  font-size: 2rem;
}
```

### Bento Grid

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.bento-large {
  grid-column: span 2;
  grid-row: span 2;
}

.bento-wide {
  grid-column: span 2;
}

.bento-tall {
  grid-row: span 2;
}
```

### 3D Phone Mockup

```css
.phone-mockup {
  position: relative;
  width: 300px;
  height: 600px;
  background: linear-gradient(
    145deg,
    #2A2A35 0%,
    #1A1A24 100%
  );
  border-radius: 40px;
  padding: 10px;
  box-shadow:
    0 50px 100px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  transform: perspective(1000px) rotateY(-15deg) rotateX(5deg);
  transition: transform 0.5s ease;
}

.phone-mockup:hover {
  transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: var(--dark);
  border-radius: 32px;
  overflow: hidden;
}

.phone-screen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.phone-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(
    ellipse at center,
    rgba(139, 92, 246, 0.2) 0%,
    transparent 70%
  );
  z-index: -1;
  animation: phone-pulse 4s ease-in-out infinite;
}

@keyframes phone-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
```

## JavaScript Effects

### advanced-effects.js

```javascript
// Particle System
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.particles = []
    this.init()
  }

  init() {
    this.resize()
    window.addEventListener('resize', () => this.resize())

    // Create particles
    for (let i = 0; i < 100; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      })
    }

    this.animate()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.particles.forEach(p => {
      // Update position
      p.x += p.speedX
      p.y += p.speedY

      // Wrap around edges
      if (p.x < 0) p.x = this.canvas.width
      if (p.x > this.canvas.width) p.x = 0
      if (p.y < 0) p.y = this.canvas.height
      if (p.y > this.canvas.height) p.y = 0

      // Draw particle
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`
      this.ctx.fill()
    })

    // Draw connections
    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          this.ctx.beginPath()
          this.ctx.moveTo(p1.x, p1.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 * (1 - distance / 100)})`
          this.ctx.stroke()
        }
      })
    })

    requestAnimationFrame(() => this.animate())
  }
}

// Mouse parallax effect
function initParallax() {
  const hero = document.querySelector('.hero')
  const orbs = document.querySelectorAll('.orb')

  hero.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e
    const { width, height } = hero.getBoundingClientRect()

    const x = (clientX / width - 0.5) * 2
    const y = (clientY / height - 0.5) * 2

    orbs.forEach((orb, i) => {
      const speed = (i + 1) * 20
      orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`
    })
  })
}

// Scroll-triggered animations
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.glass-card, .section-header').forEach(el => {
    observer.observe(el)
  })
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particles')
  if (canvas) new ParticleSystem(canvas)

  initParallax()
  initScrollAnimations()
})
```

## Responsive Design

```css
@media (max-width: 1024px) {
  .hero {
    flex-direction: column;
    text-align: center;
  }

  .hero-visual {
    margin-top: 4rem;
  }

  .phone-mockup {
    transform: none;
  }

  .bento-grid {
    grid-template-columns: 1fr 1fr;
  }

  .bento-large {
    grid-column: span 2;
    grid-row: span 1;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }

  .bento-large,
  .bento-wide {
    grid-column: span 1;
  }

  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .orb {
    display: none;
  }
}
```

## Performance Optimization

::: warning Resource Intensive
This version includes GPU-intensive effects. Implement:
- Particle count reduction on mobile
- requestAnimationFrame throttling
- Reduced motion media query support
:::

```javascript
// Performance-aware particle count
const isMobile = window.innerWidth < 768
const particleCount = isMobile ? 30 : 100

// Reduced motion support
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

if (prefersReducedMotion) {
  document.documentElement.classList.add('reduce-motion')
}
```

```css
.reduce-motion .orb,
.reduce-motion .btn-shine,
.reduce-motion .phone-glow {
  animation: none;
}

.reduce-motion #particles {
  display: none;
}
```

## Best For

- Premium product launches
- Tech/Web3 audiences
- High-impact marketing
- Brand differentiation

## File Structure

```
version5-max/
├── index.html          # Main HTML file
├── style.css           # Premium neon styles
└── advanced-effects.js # Particle, parallax effects
```

## Live Preview

```bash
cd FLOWBOND-TECH/prototypes/version5-max
python -m http.server 8000
# Open http://localhost:8000
```

## Related

- [Prototype Overview](/prototypes/overview)
- [Version 4: Retro 80s](/prototypes/version4)
- [Version 1: Modern Gradient](/prototypes/version1)
