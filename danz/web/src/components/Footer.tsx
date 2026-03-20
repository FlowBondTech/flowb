'use client'
import Link from 'next/link'
import { FaDiscord, FaInstagram, FaTiktok, FaXTwitter } from 'react-icons/fa6'

export default function Footer() {
  return (
    <footer className="bg-bg-secondary border-t border-white/5">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="font-display text-2xl font-bold">
                DANZ NOW<span className="text-neon-purple">.</span>
              </span>
            </Link>
            <p className="text-neon-purple font-semibold mb-4">Move. Connect. Earn.</p>
            <p className="text-text-secondary text-sm mb-6">
              The movement tech company rewarding authentic connection and conscious community.
            </p>
            <p className="text-text-muted text-xs mb-6">
              Powered by{' '}
              <a
                href="https://flowbond.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-purple hover:text-neon-pink transition-colors"
              >
                FlowBond.Tech
              </a>
            </p>

            {/* Social Icons */}
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                aria-label="Instagram"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                aria-label="TikTok"
              >
                <FaTiktok className="w-5 h-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                aria-label="Discord"
              >
                <FaDiscord className="w-5 h-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                aria-label="X (Twitter)"
              >
                <FaXTwitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/danz"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  $DANZ Token
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-4">
              Community
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/apply-to-host"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Apply to Host
                </Link>
              </li>
              <li>
                <Link
                  href="/join-movement"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Join Movement
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/support"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@danz.now"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Email
                </a>
              </li>
              <li>
                <Link
                  href="/press-kit"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Press Kit
                </Link>
              </li>
              <li>
                <Link
                  href="/partnerships"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Partnerships
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-text-muted text-sm mb-4 md:mb-0">
              <p>
                © 2024 DANZ NOW. All rights reserved. Powered by{' '}
                <a
                  href="https://flowbond.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-purple hover:text-neon-pink transition-colors"
                >
                  FlowBond.Tech
                </a>
              </p>
              <p className="mt-1">Contact: info@danz.now</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy-policy"
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-text-muted">•</span>
              <Link
                href="/terms-of-service"
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-text-muted">•</span>
              <Link
                href="/whitepaper"
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                Whitepaper
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
