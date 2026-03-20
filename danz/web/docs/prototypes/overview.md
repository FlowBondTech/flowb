# Design Prototypes

5 landing page design variations for the DANZ/FlowBond platform.

## Overview

The prototypes showcase different visual approaches to the DANZ landing page, from modern gradients to retro synthwave aesthetics.

| Version | Theme | Key Features |
|---------|-------|--------------|
| [Version 1](/prototypes/version1) | Modern Gradient | Professional, smooth animations |
| [Version 2](/prototypes/version2) | Neon Cyberpunk | Glitch effects, neon colors |
| [Version 3](/prototypes/version3) | Minimalist Clean | Typography-focused |
| [Version 4](/prototypes/version4) | Retro 80s | Synthwave aesthetic |
| [Version 5](/prototypes/version5) | Enhanced Neon | 3D effects, particles |

## Location

```
/home/koh/Documents/DANZ/FLOWBOND-TECH/prototypes/
├── index.html              # Prototype selector
├── shared/                 # Shared resources
│   ├── css/base.css       # Common styles
│   └── js/animations.js   # Common animations
├── version1/              # Modern Gradient
├── version2/              # Neon Cyberpunk
├── version3/              # Minimalist Clean
├── version4/              # Retro 80s
└── version5-max/          # Enhanced Neon
```

## Development

### No Build Process

These are static HTML/CSS/JS files that run directly in the browser:

```bash
# Serve locally
cd FLOWBOND-TECH/prototypes
python -m http.server 8000

# Or use any static server
npx serve .
```

### Shared Resources

Common styles and animations are in the `shared/` directory:

```html
<!-- Include in each version -->
<link rel="stylesheet" href="../shared/css/base.css">
<script src="../shared/js/animations.js"></script>
```

## Design Comparison

### Version 1: Modern Gradient

::: info Preview
Screenshots coming soon. Run the prototypes locally to preview.
:::

- **Primary Colors**: Purple gradient (#8B5CF6 → #EC4899)
- **Typography**: Clean, modern sans-serif
- **Animations**: Smooth fade-ins, hover effects
- **Best For**: Professional, corporate feel

### Version 2: Neon Cyberpunk

::: info Preview
Screenshots coming soon. Run the prototypes locally to preview.
:::

- **Primary Colors**: Neon cyan, magenta, purple
- **Typography**: Futuristic, glitch effects
- **Animations**: Glitch text, neon glow
- **Best For**: Tech-forward, gaming audience

### Version 3: Minimalist Clean

::: info Preview
Screenshots coming soon. Run the prototypes locally to preview.
:::

- **Primary Colors**: Black, white, single accent
- **Typography**: Large, bold typography
- **Animations**: Subtle, content-focused
- **Best For**: Clean, sophisticated brand

### Version 4: Retro 80s

::: info Preview
Screenshots coming soon. Run the prototypes locally to preview.
:::

- **Primary Colors**: Synthwave palette (pink, cyan, purple)
- **Typography**: Retro, neon outline text
- **Animations**: Synthwave effects, grid backgrounds
- **Best For**: Nostalgic, fun atmosphere

### Version 5: Enhanced Neon

::: info Preview
Screenshots coming soon. Run the prototypes locally to preview.
:::

- **Primary Colors**: Purple/pink neon gradient
- **Typography**: Modern with glow effects
- **Animations**: 3D transforms, particle effects
- **Best For**: Maximum impact, premium feel

## Common Structure

Each prototype follows the same HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANZ - Dance to Earn</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav><!-- Navigation --></nav>
  </header>

  <main>
    <section class="hero"><!-- Hero section --></section>
    <section class="features"><!-- Features --></section>
    <section class="how-it-works"><!-- How it works --></section>
    <section class="cta"><!-- Call to action --></section>
  </main>

  <footer><!-- Footer --></footer>

  <script src="effects.js"></script>
</body>
</html>
```

## CSS Architecture

### Base Styles (shared)

```css
/* shared/css/base.css */
:root {
  --primary: #8B5CF6;
  --secondary: #EC4899;
  --dark: #0F0F1A;
  --light: #FFFFFF;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  line-height: 1.6;
}
```

### Theme Variables

Each version overrides CSS custom properties:

```css
/* version2/style.css - Cyberpunk */
:root {
  --primary: #00FFFF;
  --secondary: #FF00FF;
  --accent: #8B5CF6;
  --glow: 0 0 20px var(--primary);
}

/* version4/style.css - Retro */
:root {
  --primary: #FF6B9D;
  --secondary: #00F5D4;
  --grid-color: rgba(255, 107, 157, 0.2);
}
```

## JavaScript Effects

### Common Animations

```javascript
// shared/js/animations.js
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
      }
    })
  }, { threshold: 0.1 })

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el)
  })
}

function initParallax() {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY
    document.querySelectorAll('.parallax').forEach(el => {
      const speed = el.dataset.speed || 0.5
      el.style.transform = `translateY(${scrolled * speed}px)`
    })
  })
}
```

### Version-Specific Effects

```javascript
// version2/cyber-effects.js
function initGlitchEffect() {
  const glitchElements = document.querySelectorAll('.glitch')
  glitchElements.forEach(el => {
    el.setAttribute('data-text', el.textContent)
  })
}

// version5-max/advanced-effects.js
function initParticles() {
  // Particle system initialization
}

function init3DEffects() {
  // 3D transform effects
}
```

## Content Synchronization

When updating content, ensure changes are reflected across all versions:

1. Update copy in version 1
2. Propagate to versions 2-5
3. Adjust for theme-specific styling
4. Test responsive breakpoints

## Performance Notes

::: warning Version 5-MAX
This version includes resource-intensive effects (particles, 3D animations). Consider performance impact on mobile devices.
:::

### Performance Tips

- Lazy load images
- Use CSS transforms over position changes
- Reduce particle counts on mobile
- Debounce scroll handlers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

All versions use modern CSS features. Older browser support is not guaranteed.

## Next Steps

- [Version 1 Details](/prototypes/version1)
- [Version 2 Details](/prototypes/version2)
- [Version 3 Details](/prototypes/version3)
- [Version 4 Details](/prototypes/version4)
- [Version 5 Details](/prototypes/version5)
