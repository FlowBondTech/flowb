# Version 2: Neon Cyberpunk

Futuristic landing page with glitch effects and neon aesthetics.

## Overview

| Property | Value |
|----------|-------|
| **Theme** | Neon Cyberpunk |
| **Primary Color** | Cyan (#00FFFF) |
| **Secondary Color** | Magenta (#FF00FF) |
| **Style** | Futuristic, Tech-forward |
| **Animation** | Glitch effects, neon glow |

## Visual Design

### Color Palette

```css
:root {
  --primary: #00FFFF;
  --secondary: #FF00FF;
  --accent: #8B5CF6;
  --neon-blue: #00D4FF;
  --neon-pink: #FF0080;
  --dark: #0A0A0F;
  --dark-grid: #0F0F1A;
  --glow-primary: 0 0 20px var(--primary), 0 0 40px var(--primary);
  --glow-secondary: 0 0 20px var(--secondary), 0 0 40px var(--secondary);
}
```

### Typography

```css
body {
  font-family: 'Orbitron', 'Rajdhani', sans-serif;
}

h1, h2, h3 {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.cyber-text {
  font-family: 'Orbitron', monospace;
  text-shadow: var(--glow-primary);
}
```

## Sections

### Hero Section

Cyberpunk hero with glitch text effect and neon borders.

```html
<section class="hero cyber-hero">
  <div class="scanlines"></div>
  <div class="hero-content">
    <h1 class="glitch" data-text="DANZ">DANZ</h1>
    <p class="cyber-subtitle">
      <span class="typing">Dance_to_Earn//Protocol</span>
    </p>
    <div class="hero-cta">
      <button class="btn cyber-btn">
        <span class="btn-text">Initialize</span>
        <span class="btn-glitch"></span>
      </button>
    </div>
  </div>
  <div class="cyber-grid"></div>
</section>
```

### Features Section

Neon-bordered cards with hover glow effects.

```html
<section class="features cyber-section">
  <h2 class="section-title neon-text">System_Features</h2>
  <div class="cyber-grid-cards">
    <div class="cyber-card">
      <div class="card-border"></div>
      <div class="card-content">
        <span class="cyber-icon">⚡</span>
        <h3>Neural_Dance</h3>
        <p>AI-powered motion analysis converts your moves into digital assets.</p>
      </div>
    </div>
    <!-- More cards -->
  </div>
</section>
```

## CSS Highlights

### Glitch Text Effect

```css
.glitch {
  position: relative;
  font-size: 6rem;
  font-weight: 900;
  color: var(--primary);
  text-shadow: var(--glow-primary);
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch::before {
  color: var(--secondary);
  animation: glitch-1 2s infinite linear alternate-reverse;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.glitch::after {
  color: var(--neon-blue);
  animation: glitch-2 3s infinite linear alternate-reverse;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

@keyframes glitch-1 {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-3px, 3px); }
  40% { transform: translate(-3px, -3px); }
  60% { transform: translate(3px, 3px); }
  80% { transform: translate(3px, -3px); }
}

@keyframes glitch-2 {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(3px, -3px); }
  40% { transform: translate(3px, 3px); }
  60% { transform: translate(-3px, -3px); }
  80% { transform: translate(-3px, 3px); }
}
```

### Neon Glow Effect

```css
.neon-text {
  color: var(--primary);
  text-shadow:
    0 0 5px var(--primary),
    0 0 10px var(--primary),
    0 0 20px var(--primary),
    0 0 40px var(--primary);
  animation: neon-pulse 1.5s ease-in-out infinite alternate;
}

@keyframes neon-pulse {
  from {
    text-shadow:
      0 0 5px var(--primary),
      0 0 10px var(--primary),
      0 0 20px var(--primary);
  }
  to {
    text-shadow:
      0 0 10px var(--primary),
      0 0 20px var(--primary),
      0 0 40px var(--primary),
      0 0 80px var(--primary);
  }
}
```

### Cyber Card

```css
.cyber-card {
  position: relative;
  background: rgba(10, 10, 15, 0.8);
  padding: 32px;
  overflow: hidden;
}

.cyber-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid var(--primary);
  opacity: 0.3;
}

.cyber-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    var(--primary) 50%,
    transparent 60%
  );
  animation: card-shine 3s infinite;
}

@keyframes card-shine {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

.cyber-card:hover {
  box-shadow: var(--glow-primary);
}

.cyber-card:hover::before {
  opacity: 1;
  border-width: 2px;
}
```

### Scanlines Overlay

```css
.scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  opacity: 0.15;
}
```

### Cyber Grid Background

```css
.cyber-grid {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background:
    linear-gradient(transparent 65%, var(--dark) 100%),
    linear-gradient(90deg, var(--primary) 1px, transparent 1px),
    linear-gradient(var(--primary) 1px, transparent 1px);
  background-size: 100% 100%, 50px 50px, 50px 50px;
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom;
  animation: grid-scroll 20s linear infinite;
}

@keyframes grid-scroll {
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 0 0, 0 100px, 0 100px; }
}
```

## JavaScript Effects

### cyber-effects.js

```javascript
// Initialize glitch effect
function initGlitchEffect() {
  const glitchElements = document.querySelectorAll('.glitch')

  glitchElements.forEach(el => {
    // Ensure data-text attribute is set
    if (!el.dataset.text) {
      el.dataset.text = el.textContent
    }
  })

  // Random glitch bursts
  setInterval(() => {
    glitchElements.forEach(el => {
      el.classList.add('glitch-active')
      setTimeout(() => el.classList.remove('glitch-active'), 200)
    })
  }, 5000)
}

// Typing effect
function initTypingEffect() {
  const typingElements = document.querySelectorAll('.typing')

  typingElements.forEach(el => {
    const text = el.textContent
    el.textContent = ''
    let i = 0

    const type = () => {
      if (i < text.length) {
        el.textContent += text.charAt(i)
        i++
        setTimeout(type, 50 + Math.random() * 50)
      }
    }

    type()
  })
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initGlitchEffect()
  initTypingEffect()
})
```

### Cursor Trail Effect

```javascript
function initCursorTrail() {
  const trail = []
  const trailLength = 10

  for (let i = 0; i < trailLength; i++) {
    const dot = document.createElement('div')
    dot.className = 'cursor-trail'
    document.body.appendChild(dot)
    trail.push(dot)
  }

  let mouseX = 0, mouseY = 0

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
  })

  function animate() {
    let x = mouseX, y = mouseY

    trail.forEach((dot, i) => {
      const nextDot = trail[i + 1] || trail[0]

      dot.style.left = x + 'px'
      dot.style.top = y + 'px'
      dot.style.opacity = 1 - (i / trailLength)
      dot.style.transform = `scale(${1 - (i / trailLength) * 0.5})`

      x += (nextDot.offsetLeft - x) * 0.3
      y += (nextDot.offsetTop - y) * 0.3
    })

    requestAnimationFrame(animate)
  }

  animate()
}
```

## Responsive Design

```css
@media (max-width: 768px) {
  .glitch {
    font-size: 3rem;
  }

  .cyber-grid-cards {
    grid-template-columns: 1fr;
  }

  .cyber-grid {
    display: none; /* Hide on mobile for performance */
  }

  .scanlines {
    opacity: 0.05;
  }
}
```

## Performance Considerations

::: warning GPU Intensive
This version uses heavy CSS animations and effects. Consider:
- Reducing animation complexity on mobile
- Using `will-change` for animated elements
- Implementing reduced-motion media query
:::

```css
@media (prefers-reduced-motion: reduce) {
  .glitch::before,
  .glitch::after,
  .neon-text,
  .cyber-grid {
    animation: none;
  }

  .scanlines {
    display: none;
  }
}
```

## Best For

- Gaming and esports audiences
- Tech-forward brand positioning
- NFT/Web3 communities
- Younger, trend-aware demographics

## File Structure

```
version2/
├── index.html        # Main HTML file
├── style.css         # Cyberpunk theme styles
└── cyber-effects.js  # Glitch and neon effects
```

## Live Preview

```bash
cd FLOWBOND-TECH/prototypes/version2
python -m http.server 8000
# Open http://localhost:8000
```

## Related

- [Prototype Overview](/prototypes/overview)
- [Version 1: Modern Gradient](/prototypes/version1)
- [Version 3: Minimalist](/prototypes/version3)
