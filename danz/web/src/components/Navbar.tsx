'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated, user, login, logout, isLoading } = useAuth()
  const { mode, toggleMode } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = (e: React.MouseEvent, hash: string) => {
    if (!isHomePage) {
      e.preventDefault()
      window.location.href = `/${hash}`
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-bg-primary/95 backdrop-blur-xl py-4 border-b border-neon-purple/20'
          : 'bg-bg-primary/80 backdrop-blur-lg py-6'
      }`}
    >
      <div className="container flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <span className="font-display text-2xl font-bold text-text-primary">
            DANZ<span className="text-neon-purple text-3xl">.</span>NOW
          </span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-8">
          <li>
            <Link
              href="/events"
              className="text-text-secondary hover:text-neon-purple transition-colors font-medium"
            >
              Discover
            </Link>
          </li>
          <li>
            <a
              href={isHomePage ? '#dancers' : '/#dancers'}
              onClick={e => handleNavClick(e, '#dancers')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              For Dancers
            </a>
          </li>
          <li>
            <a
              href={isHomePage ? '#hosts' : '/#hosts'}
              onClick={e => handleNavClick(e, '#hosts')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              For Hosts
            </a>
          </li>
          <li>
            <Link
              href="/danz"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Token
            </Link>
          </li>
          <li>
            <a
              href={isHomePage ? '#device' : '/#device'}
              onClick={e => handleNavClick(e, '#device')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Device
            </a>
          </li>
          <li>
            <a
              href={isHomePage ? '#about' : '/#about'}
              onClick={e => handleNavClick(e, '#about')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              About
            </a>
          </li>
          <li>
            <a
              href={isHomePage ? '#faq' : '/#faq'}
              onClick={e => handleNavClick(e, '#faq')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              FAQ
            </a>
          </li>
        </ul>

        {/* Desktop Auth Section */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            type="button"
            onClick={toggleMode}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
          </button>
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-8 h-8 bg-white/10 animate-pulse rounded-full" />
              <div className="w-20 h-4 bg-white/10 animate-pulse rounded" />
            </div>
          ) : isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name || user.username || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-neon-purple/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-text-primary text-sm">
                  {user?.display_name || user?.username || 'User'}
                </span>
                <svg
                  className={`w-4 h-4 text-text-secondary transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-secondary rounded-lg shadow-xl border border-neon-purple/20 overflow-hidden">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 text-text-primary hover:bg-white/10 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors border-t border-white/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => login()} className="btn btn-primary">
              Login
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="lg:hidden relative w-8 h-8 flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span
            className={`absolute w-6 flex flex-col gap-1.5 transition-all ${mobileMenuOpen ? 'rotate-45' : ''}`}
          >
            <span
              className={`h-0.5 bg-text-primary transition-all ${mobileMenuOpen ? 'rotate-90 translate-y-2' : ''}`}
            />
            <span
              className={`h-0.5 bg-text-primary transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`h-0.5 bg-text-primary transition-all ${mobileMenuOpen ? '-rotate-90 -translate-y-2' : ''}`}
            />
          </span>
        </button>

        {/* Mobile Menu */}
        <div
          className={`fixed top-0 right-0 h-screen w-full sm:w-80 bg-bg-secondary transform transition-transform duration-300 lg:hidden ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6 text-text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="p-8 pt-24">
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors w-full"
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {mode === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
              <span>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <ul className="flex flex-col gap-6">
              <li>
                <Link
                  href="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-neon-purple hover:text-neon-pink transition-colors font-medium"
                >
                  Discover Events
                </Link>
              </li>
              <li>
                <a
                  href={isHomePage ? '#dancers' : '/#dancers'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  For Dancers
                </a>
              </li>
              <li>
                <a
                  href={isHomePage ? '#hosts' : '/#hosts'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  For Hosts
                </a>
              </li>
              <li>
                <Link
                  href="/danz"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Token
                </Link>
              </li>
              <li>
                <a
                  href={isHomePage ? '#device' : '/#device'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Device
                </a>
              </li>
              <li>
                <a
                  href={isHomePage ? '#about' : '/#about'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href={isHomePage ? '#faq' : '/#faq'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li className="mt-8">
                {isLoading ? (
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                    <div className="w-10 h-10 bg-white/20 animate-pulse rounded-full" />
                    <div className="flex-1">
                      <div className="w-24 h-4 bg-white/20 animate-pulse rounded mb-2" />
                      <div className="w-16 h-3 bg-white/20 animate-pulse rounded" />
                    </div>
                  </div>
                ) : isAuthenticated && user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || user.username || 'User'}
                          className="w-10 h-10 rounded-full object-cover border border-neon-purple/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="text-text-primary">
                        {user?.display_name || user?.username || 'User'}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      className="btn btn-secondary w-full text-center block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="btn btn-outline w-full"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => login()} className="btn btn-primary w-full">
                    Login
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}
