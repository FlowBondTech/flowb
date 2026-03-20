# Version 1: Modern Gradient

Professional landing page with smooth gradient effects and clean animations.

## Overview

| Property | Value |
|----------|-------|
| **Theme** | Modern Gradient |
| **Primary Color** | Purple (#8B5CF6) |
| **Secondary Color** | Pink (#EC4899) |
| **Style** | Professional, Corporate |
| **Animation** | Smooth fade-ins |

## Visual Design

### Color Palette

```css
:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --secondary: #EC4899;
  --secondary-dark: #DB2777;
  --dark: #0F0F1A;
  --dark-lighter: #1A1A2E;
  --light: #FFFFFF;
  --light-muted: #A1A1AA;
  --gradient: linear-gradient(135deg, var(--primary), var(--secondary));
}
```

### Typography

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

h1, h2, h3 {
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.1;
}
```

## Sections

### Hero Section

The hero section features a centered layout with gradient text and a prominent CTA.

```html
<section class="hero">
  <div class="hero-content">
    <h1 class="hero-title">
      <span class="gradient-text">Dance to Earn</span>
      <br />Your Moves Matter
    </h1>
    <p class="hero-subtitle">
      Join the first dance-to-earn platform where your passion
      for movement transforms into real rewards.
    </p>
    <div class="hero-cta">
      <button class="btn btn-primary">Get Started</button>
      <button class="btn btn-outline">Learn More</button>
    </div>
  </div>
  <div class="hero-visual">
    <!-- Animated gradient orb -->
    <div class="gradient-orb"></div>
  </div>
</section>
```

### Features Section

Three-column grid showcasing platform features.

```html
<section class="features">
  <h2 class="section-title">Why DANZ?</h2>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">💃</div>
      <h3>Dance & Earn</h3>
      <p>Convert your dance moves into DANZ tokens through our AI-powered motion tracking.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🎯</div>
      <h3>Track Progress</h3>
      <p>Monitor your improvement with detailed analytics and achievement systems.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🤝</div>
      <h3>Connect</h3>
      <p>Build dance bonds, find events, and grow your community.</p>
    </div>
  </div>
</section>
```

### How It Works

Step-by-step process explanation with numbered steps.

```html
<section class="how-it-works">
  <h2 class="section-title">How It Works</h2>
  <div class="steps">
    <div class="step">
      <span class="step-number">01</span>
      <h3>Download the App</h3>
      <p>Get DANZ on iOS or Android</p>
    </div>
    <div class="step">
      <span class="step-number">02</span>
      <h3>Start Dancing</h3>
      <p>Let our AI track your moves</p>
    </div>
    <div class="step">
      <span class="step-number">03</span>
      <h3>Earn Rewards</h3>
      <p>Get DANZ tokens for dancing</p>
    </div>
  </div>
</section>
```

## CSS Highlights

### Gradient Text Effect

```css
.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Smooth Button Animations

```css
.btn {
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--gradient);
  color: white;
  border: none;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
}

.btn-outline {
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  border-color: var(--primary);
  background: rgba(139, 92, 246, 0.1);
}
```

### Card Hover Effects

```css
.feature-card {
  background: var(--dark-lighter);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
}
```

### Animated Gradient Orb

```css
.gradient-orb {
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: var(--gradient);
  filter: blur(80px);
  opacity: 0.5;
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}
```

## JavaScript Effects

### Scroll Animations

```javascript
// Fade in on scroll
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el)
  })
})
```

### Smooth Scroll Navigation

```javascript
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault()
    const target = document.querySelector(this.getAttribute('href'))
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  })
})
```

## Responsive Design

### Mobile Breakpoints

```css
/* Tablet */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .hero-cta {
    flex-direction: column;
    gap: 12px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .hero {
    padding: 60px 20px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .section-title {
    font-size: 1.75rem;
  }
}
```

## Best For

- Professional brand presentations
- Corporate stakeholder demos
- Users who prefer clean, modern aesthetics
- Applications requiring accessible design

## File Structure

```
version1/
├── index.html      # Main HTML file
├── style.css       # Theme-specific styles
└── effects.js      # Animation scripts
```

## Live Preview

```bash
cd FLOWBOND-TECH/prototypes/version1
python -m http.server 8000
# Open http://localhost:8000
```

## Related

- [Prototype Overview](/prototypes/overview)
- [Version 2: Neon Cyberpunk](/prototypes/version2)
- [Version 3: Minimalist](/prototypes/version3)
