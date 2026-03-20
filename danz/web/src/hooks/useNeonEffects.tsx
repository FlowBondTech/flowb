import { type MutableRefObject, useEffect, useRef } from 'react'

// Create particle system
export function useParticles() {
  useEffect(() => {
    const particlesContainer = document.querySelector('.particles') as HTMLElement
    if (!particlesContainer) return

    const particleCount = 50

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: ${Math.random() > 0.5 ? '#ff6ec7' : '#b967ff'};
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float-particle-${i} ${Math.random() * 20 + 20}s linear infinite;
        opacity: ${Math.random() * 0.5 + 0.3};
      `
      particlesContainer.appendChild(particle)
    }

    // Add floating animation
    const style = document.createElement('style')
    let styleContent = ''
    for (let i = 0; i < particleCount; i++) {
      styleContent += `
        @keyframes float-particle-${i} {
          0% {
            transform: translateY(100vh) translateX(0);
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px);
          }
        }
      `
    }
    style.textContent = styleContent
    document.head.appendChild(style)

    // Cleanup
    return () => {
      particlesContainer.innerHTML = ''
      style.remove()
    }
  }, [])
}

// Smooth scroll indicator
export function useScrollIndicator() {
  useEffect(() => {
    const scrollIndicator = document.createElement('div')
    scrollIndicator.className = 'scroll-indicator'
    scrollIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(135deg, #ff6ec7 0%, #b967ff 100%);
      transition: width 0.3s ease;
      z-index: 9999;
      width: 0%;
    `
    document.body.appendChild(scrollIndicator)

    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = (window.scrollY / windowHeight) * 100
      scrollIndicator.style.width = `${scrolled}%`
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      scrollIndicator.remove()
    }
  }, [])
}

// Magnetic button effect
export function useMagneticButtons() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const button = e.currentTarget as HTMLElement
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      // Stronger magnetic effect
      button.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`
      button.style.transition = 'transform 0.1s ease-out'
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const button = e.currentTarget as HTMLElement
      button.style.transform = 'translate(0, 0)'
      button.style.transition = 'transform 0.3s ease-out'
    }

    // Small delay to ensure buttons are rendered
    const timer = setTimeout(() => {
      const buttons = document.querySelectorAll('.btn')
      for (const button of buttons) {
        button.addEventListener('mousemove', handleMouseMove as EventListener)
        button.addEventListener('mouseleave', handleMouseLeave as EventListener)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      const buttons = document.querySelectorAll('.btn')
      for (const button of buttons) {
        button.removeEventListener('mousemove', handleMouseMove as EventListener)
        button.removeEventListener('mouseleave', handleMouseLeave as EventListener)
      }
    }
  }, [])
}

// Glow effect on hover
export function useGlowEffects() {
  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const element = e.currentTarget as HTMLElement
      const glow = document.createElement('div')
      glow.className = 'hover-glow'
      glow.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at ${(e as any).offsetX}px ${(e as any).offsetY}px, rgba(255, 110, 199, 0.2) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      `
      element.appendChild(glow)

      setTimeout(() => {
        glow.style.opacity = '0'
        glow.style.transition = 'opacity 0.5s ease'
        setTimeout(() => glow.remove(), 500)
      }, 300)
    }

    const glowElements = document.querySelectorAll('.process-card, .utility-card, .faq-card')
    for (const element of glowElements) {
      element.addEventListener('mouseenter', handleMouseEnter as EventListener)
    }

    return () => {
      for (const element of glowElements) {
        element.removeEventListener('mouseenter', handleMouseEnter as EventListener)
      }
    }
  }, [])
}

// Typing effect for hero title
export function useTypingEffect(titleRef: MutableRefObject<HTMLElement | null>) {
  const cursorRef = useRef<HTMLElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!titleRef.current) return

    const heroTitle = titleRef.current
    const text = 'Move. Connect. Earn.' // Fixed text instead of reading from DOM
    heroTitle.textContent = ''
    heroTitle.style.minHeight = '1.2em'

    // Add cursor blink animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `
    document.head.appendChild(style)

    // Small delay to ensure the element is visible
    timeoutRef.current = setTimeout(() => {
      let index = 0
      intervalRef.current = setInterval(() => {
        if (index < text.length) {
          heroTitle.textContent += text[index]
          index++
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current)
          // Add cursor blink
          const cursor = document.createElement('span')
          cursor.className = 'typing-cursor'
          cursor.style.cssText = `
            display: inline-block;
            width: 3px;
            height: 1em;
            background: linear-gradient(135deg, #ff6ec7 0%, #b967ff 100%);
            margin-left: 5px;
            animation: cursor-blink 1s infinite;
          `
          heroTitle.appendChild(cursor)
          cursorRef.current = cursor
        }
      }, 100)
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (cursorRef.current) {
        cursorRef.current.remove()
      }
      style.remove()
    }
  }, [titleRef])
}

// Number counter animation
export function useCounters(counterRefs: MutableRefObject<(HTMLElement | null)[]>) {
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (const counter of counterRefs.current) {
      if (!counter) return

      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = Number.parseInt(counter.dataset.target || '0')
            const duration = 2000
            const increment = target / (duration / 16)
            let current = 0

            counter.style.fontVariantNumeric = 'tabular-nums'

            const timer = setInterval(() => {
              current += increment
              if (current >= target) {
                current = target
                clearInterval(timer)
                // Add completion effect
                counter.style.animation = 'counter-complete 0.5s ease'
              }
              counter.textContent = Math.floor(current).toString()
            }, 16)

            observer.unobserve(entry.target)
          }
        }
      })

      observer.observe(counter)
      observers.push(observer)
    }

    // Add completion animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes counter-complete {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `
    document.head.appendChild(style)

    return () => {
      for (const observer of observers) {
        observer.disconnect()
      }
      style.remove()
    }
  }, [counterRefs])
}

// Smooth reveal animations
export function useRevealAnimations() {
  useEffect(() => {
    const animatedElements = document.querySelectorAll('.animate')

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px',
    }

    const observer = new IntersectionObserver(entries => {
      let index = 0
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('fade-in')
          }, index * 50)
          observer.unobserve(entry.target)
        }
        index++
      }
    }, observerOptions)

    for (const el of animatedElements) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
  }, [])
}

// Combined hook for all effects
export function useAllNeonEffects() {
  useParticles()
  useScrollIndicator()
  useMagneticButtons()
  useGlowEffects()
  useRevealAnimations()
}
