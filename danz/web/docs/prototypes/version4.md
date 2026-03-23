# Version 4: Retro 80s

Synthwave-inspired landing page with neon grids and retro aesthetics.

## Overview

| Property | Value |
|----------|-------|
| **Theme** | Retro 80s / Synthwave |
| **Primary Color** | Hot Pink (#FF6B9D) |
| **Secondary Color** | Cyan (#00F5D4) |
| **Style** | Nostalgic, Energetic |
| **Animation** | Synthwave effects, grid motion |

## Visual Design

### Color Palette

```css
:root {
  --primary: #FF6B9D;
  --secondary: #00F5D4;
  --accent: #FFE66D;
  --purple: #BD00FF;
  --blue: #00B4D8;
  --dark: #0D0221;
  --dark-purple: #1A0533;
  --grid-color: rgba(255, 107, 157, 0.3);
  --sun-gradient: linear-gradient(
    180deg,
    #FF6B9D 0%,
    #FF8E3C 50%,
    #FFE66D 100%
  );
}
```

### Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Audiowide&display=swap');

body {
  font-family: 'Audiowide', sans-serif;
}

h1, h2, h3 {
  font-family: 'Press Start 2P', cursive;
  text-transform: uppercase;
}

.retro-title {
  font-size: clamp(2rem, 6vw, 5rem);
  line-height: 1.4;
  text-shadow:
    3px 3px 0 var(--primary),
    6px 6px 0 var(--purple),
    9px 9px 0 var(--secondary);
}
```

## Sections

### Hero Section

Synthwave hero with sunset, grid, and chrome text.

```html
<section class="hero retro-hero">
  <!-- Synthwave Sun -->
  <div class="sun">
    <div class="sun-lines"></div>
  </div>

  <!-- Perspective Grid -->
  <div class="retro-grid"></div>

  <!-- Mountains Silhouette -->
  <div class="mountains"></div>

  <div class="hero-content">
    <h1 class="retro-title chrome-text">DANZ</h1>
    <p class="retro-subtitle">
      <span class="neon-pink">DANCE</span>
      <span class="neon-cyan">TO</span>
      <span class="neon-yellow">EARN</span>
    </p>
    <button class="retro-btn">
      <span>INSERT COIN</span>
    </button>
  </div>
</section>
```

### Features Section

Arcade-style feature cards.

```html
<section class="features retro-section">
  <h2 class="section-title">SELECT YOUR MODE</h2>
  <div class="arcade-grid">
    <div class="arcade-card">
      <div class="card-screen">
        <span class="arcade-icon">🕹️</span>
        <h3>SOLO MODE</h3>
        <p>Dance alone. Earn rewards. Level up your skills.</p>
      </div>
      <div class="card-base"></div>
    </div>
    <div class="arcade-card">
      <div class="card-screen">
        <span class="arcade-icon">👯</span>
        <h3>MULTIPLAYER</h3>
        <p>Connect with dancers. Build bonds. Compete together.</p>
      </div>
      <div class="card-base"></div>
    </div>
    <div class="arcade-card">
      <div class="card-screen">
        <span class="arcade-icon">🏆</span>
        <h3>TOURNAMENTS</h3>
        <p>Join battles. Win prizes. Become a legend.</p>
      </div>
      <div class="card-base"></div>
    </div>
  </div>
</section>
```

## CSS Highlights

### Synthwave Sun

```css
.sun {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: var(--sun-gradient);
  box-shadow:
    0 0 60px rgba(255, 107, 157, 0.5),
    0 0 120px rgba(255, 107, 157, 0.3);
}

.sun-lines {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
}

.sun-lines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200%;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 8px,
    var(--dark) 8px,
    var(--dark) 16px
  );
  animation: sun-scroll 2s linear infinite;
}

@keyframes sun-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(32px); }
}
```

### Retro Grid

```css
.retro-grid {
  position: absolute;
  bottom: 0;
  left: -50%;
  right: -50%;
  height: 50%;
  background:
    linear-gradient(
      to bottom,
      transparent 0%,
      var(--dark) 100%
    ),
    repeating-linear-gradient(
      90deg,
      var(--grid-color) 0px,
      var(--grid-color) 1px,
      transparent 1px,
      transparent 80px
    ),
    repeating-linear-gradient(
      0deg,
      var(--grid-color) 0px,
      var(--grid-color) 1px,
      transparent 1px,
      transparent 80px
    );
  transform: perspective(200px) rotateX(60deg);
  transform-origin: center top;
  animation: grid-move 10s linear infinite;
}

@keyframes grid-move {
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 0 0, 0 160px, 0 160px; }
}
```

### Chrome Text Effect

```css
.chrome-text {
  background: linear-gradient(
    180deg,
    #FFFFFF 0%,
    #FFFFFF 30%,
    #FF6B9D 45%,
    #BD00FF 55%,
    #00F5D4 70%,
    #00B4D8 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px var(--primary));
}
```

### Neon Text Effects

```css
.neon-pink {
  color: var(--primary);
  text-shadow:
    0 0 5px var(--primary),
    0 0 10px var(--primary),
    0 0 20px var(--primary),
    0 0 40px var(--primary);
  animation: neon-flicker 3s infinite;
}

.neon-cyan {
  color: var(--secondary);
  text-shadow:
    0 0 5px var(--secondary),
    0 0 10px var(--secondary),
    0 0 20px var(--secondary);
}

.neon-yellow {
  color: var(--accent);
  text-shadow:
    0 0 5px var(--accent),
    0 0 10px var(--accent),
    0 0 20px var(--accent);
}

@keyframes neon-flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.8; }
  94% { opacity: 1; }
  95% { opacity: 0.9; }
  96% { opacity: 1; }
}
```

### Retro Button

```css
.retro-btn {
  position: relative;
  padding: 20px 50px;
  font-family: 'Press Start 2P', cursive;
  font-size: 1rem;
  color: var(--dark);
  background: linear-gradient(
    180deg,
    var(--accent) 0%,
    #FFB833 100%
  );
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-transform: uppercase;
  box-shadow:
    0 6px 0 #CC8800,
    0 8px 20px rgba(255, 230, 109, 0.5);
  transition: all 0.1s ease;
}

.retro-btn:hover {
  transform: translateY(2px);
  box-shadow:
    0 4px 0 #CC8800,
    0 6px 15px rgba(255, 230, 109, 0.5);
}

.retro-btn:active {
  transform: translateY(4px);
  box-shadow:
    0 2px 0 #CC8800,
    0 4px 10px rgba(255, 230, 109, 0.5);
}
```

### Arcade Card

```css
.arcade-card {
  position: relative;
}

.card-screen {
  background: linear-gradient(
    180deg,
    var(--dark-purple) 0%,
    var(--dark) 100%
  );
  border: 4px solid var(--primary);
  border-radius: 8px 8px 0 0;
  padding: 40px 30px;
  text-align: center;
  box-shadow:
    inset 0 0 30px rgba(255, 107, 157, 0.1),
    0 0 15px rgba(255, 107, 157, 0.3);
}

.card-base {
  height: 20px;
  background: linear-gradient(
    180deg,
    #4A4A4A 0%,
    #2A2A2A 100%
  );
  border-radius: 0 0 8px 8px;
}

.arcade-icon {
  display: block;
  font-size: 3rem;
  margin-bottom: 1rem;
}

.arcade-card:hover .card-screen {
  box-shadow:
    inset 0 0 50px rgba(255, 107, 157, 0.2),
    0 0 30px rgba(255, 107, 157, 0.5);
}
```

## JavaScript Effects

### retro-effects.js

```javascript
// VHS static effect
function initVHSEffect() {
  const canvas = document.createElement('canvas')
  canvas.className = 'vhs-noise'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  function drawNoise() {
    const imageData = ctx.createImageData(canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255
      data[i] = value     // R
      data[i + 1] = value // G
      data[i + 2] = value // B
      data[i + 3] = 10    // A (very subtle)
    }

    ctx.putImageData(imageData, 0, 0)
    requestAnimationFrame(drawNoise)
  }

  drawNoise()
}

// Scanline effect
function initScanlines() {
  const scanlines = document.createElement('div')
  scanlines.className = 'scanlines'
  scanlines.innerHTML = `
    <style>
      .scanlines {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.1) 0px,
          rgba(0, 0, 0, 0.1) 1px,
          transparent 1px,
          transparent 3px
        );
        animation: scanline-move 8s linear infinite;
      }

      @keyframes scanline-move {
        0% { background-position: 0 0; }
        100% { background-position: 0 100px; }
      }
    </style>
  `
  document.body.appendChild(scanlines)
}

// Star field background
function initStarfield() {
  const starfield = document.querySelector('.starfield')
  if (!starfield) return

  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3}px;
      height: ${Math.random() * 3}px;
      background: white;
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      animation: twinkle ${1 + Math.random() * 2}s infinite;
    `
    starfield.appendChild(star)
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initVHSEffect()
  initScanlines()
  initStarfield()
})
```

## Responsive Design

```css
@media (max-width: 768px) {
  .retro-title {
    font-size: 2rem;
    text-shadow:
      2px 2px 0 var(--primary),
      4px 4px 0 var(--purple);
  }

  .sun {
    width: 200px;
    height: 200px;
    bottom: 25%;
  }

  .arcade-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .retro-btn {
    font-size: 0.75rem;
    padding: 15px 30px;
  }
}

@media (max-width: 480px) {
  .retro-subtitle {
    font-size: 0.875rem;
  }

  .retro-grid {
    display: none;
  }
}
```

## Performance Notes

::: warning Animation Heavy
This version includes multiple animated backgrounds. Consider:
- Disabling VHS noise on mobile
- Reducing star count on lower-end devices
- Using `will-change` for animated elements
:::

```css
@media (prefers-reduced-motion: reduce) {
  .sun-lines::before,
  .retro-grid,
  .neon-pink {
    animation: none;
  }

  .vhs-noise,
  .scanlines {
    display: none;
  }
}
```

## Best For

- Dance/music events
- Nostalgic brand appeal
- Gaming-adjacent audiences
- Fun, energetic brand positioning

## File Structure

```
version4/
├── index.html       # Main HTML file
├── style.css        # Retro synthwave styles
└── retro-effects.js # VHS, scanline, star effects
```

## Live Preview

```bash
cd FLOWBOND-TECH/prototypes/version4
python -m http.server 8000
# Open http://localhost:8000
```

## Related

- [Prototype Overview](/prototypes/overview)
- [Version 3: Minimalist](/prototypes/version3)
- [Version 5: Enhanced Neon](/prototypes/version5)
