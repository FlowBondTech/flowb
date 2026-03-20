import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import UserButton from './UserButton'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  const handleNavClick = (e, hash) => {
    if (!isHomePage) {
      e.preventDefault()
      window.location.href = `/${hash}`
    }
  }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <Link to="/" className="logo">
          <img src="/danz-icon-pink.png" alt="DANZ.NOW" className="logo-icon" />
          <span className="logo-text">DANZ<span className="logo-accent">.</span>NOW</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="nav-links desktop">
          <li><a href={isHomePage ? "#how-it-works" : "/#how-it-works"} onClick={(e) => handleNavClick(e, '#how-it-works')}>How It Works</a></li>
          <li><a href={isHomePage ? "#dancers" : "/#dancers"} onClick={(e) => handleNavClick(e, '#dancers')}>For Dancers</a></li>
          <li><a href={isHomePage ? "#hosts" : "/#hosts"} onClick={(e) => handleNavClick(e, '#hosts')}>For Hosts</a></li>
          <li><a href={isHomePage ? "#about" : "/#about"} onClick={(e) => handleNavClick(e, '#about')}>About</a></li>
          <li><a href={isHomePage ? "#faq" : "/#faq"} onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a></li>
        </ul>
        <UserButton />

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="mobile-nav-links">
            <li><a href={isHomePage ? "#how-it-works" : "/#how-it-works"} onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
            <li><a href={isHomePage ? "#dancers" : "/#dancers"} onClick={() => setMobileMenuOpen(false)}>For Dancers</a></li>
            <li><a href={isHomePage ? "#hosts" : "/#hosts"} onClick={() => setMobileMenuOpen(false)}>For Hosts</a></li>
            <li><a href={isHomePage ? "#about" : "/#about"} onClick={() => setMobileMenuOpen(false)}>About</a></li>
            <li><a href={isHomePage ? "#faq" : "/#faq"} onClick={() => setMobileMenuOpen(false)}>FAQ</a></li>
            <li><a href="#" className="btn btn-nav" onClick={() => setMobileMenuOpen(false)}>Get the App</a></li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
