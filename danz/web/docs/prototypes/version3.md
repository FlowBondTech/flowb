# Version 3: Minimalist Clean

Typography-focused landing page with clean aesthetics and subtle animations.

## Overview

| Property | Value |
|----------|-------|
| **Theme** | Minimalist Clean |
| **Primary Color** | Black (#000000) |
| **Accent Color** | Purple (#8B5CF6) |
| **Style** | Clean, Sophisticated |
| **Animation** | Subtle, Content-focused |

## Visual Design

### Color Palette

```css
:root {
  --primary: #000000;
  --secondary: #FFFFFF;
  --accent: #8B5CF6;
  --gray-50: #FAFAFA;
  --gray-100: #F4F4F5;
  --gray-200: #E4E4E7;
  --gray-400: #A1A1AA;
  --gray-600: #52525B;
  --gray-800: #27272A;
  --gray-900: #18181B;
}
```

### Typography

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  line-height: 1.7;
  color: var(--gray-800);
}

h1 {
  font-size: clamp(3rem, 8vw, 7rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
}

h2 {
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.body-large {
  font-size: 1.25rem;
  color: var(--gray-600);
}
```

## Sections

### Hero Section

Clean, typography-dominated hero with minimal visual elements.

```html
<section class="hero">
  <div class="hero-content">
    <h1>
      Move.<br />
      <span class="accent">Earn.</span><br />
      Connect.
    </h1>
    <p class="hero-subtitle body-large">
      The first platform where your dance moves
      transform into real value.
    </p>
    <div class="hero-cta">
      <a href="#" class="btn btn-primary">Start Dancing</a>
      <a href="#" class="btn btn-text">Watch Demo →</a>
    </div>
  </div>
</section>
```

### Features Section

Clean grid with icon-free cards relying on typography hierarchy.

```html
<section class="features">
  <div class="features-header">
    <span class="section-label">Features</span>
    <h2>Everything you need to monetize your moves</h2>
  </div>

  <div class="features-grid">
    <div class="feature-card">
      <span class="feature-number">01</span>
      <h3>AI Motion Tracking</h3>
      <p>
        Advanced algorithms analyze your dance moves
        in real-time, capturing every step and gesture.
      </p>
    </div>
    <div class="feature-card">
      <span class="feature-number">02</span>
      <h3>Token Rewards</h3>
      <p>
        Earn DANZ tokens based on your dance quality,
        consistency, and community engagement.
      </p>
    </div>
    <div class="feature-card">
      <span class="feature-number">03</span>
      <h3>Social Network</h3>
      <p>
        Connect with dancers worldwide, share achievements,
        and build lasting dance bonds.
      </p>
    </div>
  </div>
</section>
```

### Stats Section

Bold numbers with minimal decoration.

```html
<section class="stats">
  <div class="stats-grid">
    <div class="stat">
      <span class="stat-number">50K+</span>
      <span class="stat-label">Active Dancers</span>
    </div>
    <div class="stat">
      <span class="stat-number">1M+</span>
      <span class="stat-label">Sessions Tracked</span>
    </div>
    <div class="stat">
      <span class="stat-number">$2M</span>
      <span class="stat-label">Rewards Distributed</span>
    </div>
  </div>
</section>
```

## CSS Highlights

### Hero Typography

```css
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 0 8%;
}

.hero h1 {
  margin-bottom: 2rem;
}

.hero .accent {
  color: var(--accent);
}

.hero-subtitle {
  max-width: 480px;
  margin-bottom: 3rem;
}
```

### Minimal Button Styles

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: var(--secondary);
  border: 2px solid var(--primary);
}

.btn-primary:hover {
  background: transparent;
  color: var(--primary);
}

.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 16px 0;
  border: none;
}

.btn-text:hover {
  color: var(--accent);
}
```

### Feature Cards

```css
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4rem;
}

.feature-card {
  position: relative;
}

.feature-number {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.feature-card p {
  color: var(--gray-600);
  line-height: 1.7;
}
```

### Stats Section

```css
.stats {
  padding: 8rem 8%;
  background: var(--gray-50);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4rem;
  text-align: center;
}

.stat-number {
  display: block;
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

### Subtle Animations

```css
/* Fade up on scroll */
.animate-fade-up {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Underline hover effect */
.link-underline {
  position: relative;
}

.link-underline::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}

.link-underline:hover::after {
  width: 100%;
}
```

### Divider Lines

```css
.divider {
  width: 60px;
  height: 2px;
  background: var(--primary);
  margin: 2rem 0;
}

.section-label {
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--accent);
  margin-bottom: 1rem;
}
```

## JavaScript Effects

### Minimal effects.js

```javascript
// Scroll reveal animation
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger animation
          setTimeout(() => {
            entry.target.classList.add('visible')
          }, index * 100)
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '-50px'
    }
  )

  document.querySelectorAll('.animate-fade-up').forEach((el) => {
    observer.observe(el)
  })
})

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
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

### Counter Animation

```javascript
function animateCounter(element, target, duration = 2000) {
  let start = 0
  const increment = target / (duration / 16)

  const updateCounter = () => {
    start += increment
    if (start < target) {
      element.textContent = formatNumber(Math.floor(start))
      requestAnimationFrame(updateCounter)
    } else {
      element.textContent = formatNumber(target)
    }
  }

  updateCounter()
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

// Trigger on scroll
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const number = entry.target.dataset.value
      animateCounter(entry.target, parseInt(number))
      statsObserver.unobserve(entry.target)
    }
  })
})

document.querySelectorAll('.stat-number').forEach(el => {
  statsObserver.observe(el)
})
```

## Responsive Design

```css
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 3rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 0 6%;
  }

  .features-grid,
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .stats {
    text-align: left;
  }
}

@media (max-width: 480px) {
  body {
    font-size: 16px;
  }

  .hero h1 {
    font-size: 2.5rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
```

## Best For

- Premium brand positioning
- Design-conscious audiences
- Portfolio showcases
- Brands valuing simplicity and elegance

## File Structure

```
version3/
├── index.html    # Main HTML file
├── style.css     # Minimalist theme styles
└── effects.js    # Subtle animation scripts
```

## Live Preview

```bash
cd FLOWBOND-TECH/prototypes/version3
python -m http.server 8000
# Open http://localhost:8000
```

## Related

- [Prototype Overview](/prototypes/overview)
- [Version 2: Neon Cyberpunk](/prototypes/version2)
- [Version 4: Retro 80s](/prototypes/version4)
