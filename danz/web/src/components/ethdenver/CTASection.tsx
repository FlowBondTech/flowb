'use client'

import { motion } from 'motion/react'

export default function CTASection() {
  return (
    <section id="cta" className="section relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-bg-primary to-pink-900/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            Ready to <span className="gradient-text gradient-text-animate">Activate</span>?
          </h2>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed">
            Whether you're a sponsor looking for real engagement, an organizer building
            unforgettable experiences, or a venue wanting more foot traffic — let's build something
            together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.a
              href="https://t.me/+gB4tOXiCexI5MGEx"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary text-lg px-10 py-4"
            >
              Become a Sponsor
            </motion.a>
            <motion.a
              href="https://t.me/+gB4tOXiCexI5MGEx"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-secondary text-lg px-10 py-4"
            >
              Partner With Us
            </motion.a>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-text-muted text-sm">
            <a
              href="https://t.me/+gB4tOXiCexI5MGEx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neon-purple transition-colors"
            >
              Join us on Telegram
            </a>
            <span className="hidden sm:inline">|</span>
            <span>@danz_now on X</span>
            <span className="hidden sm:inline">|</span>
            <span>ETHDenver 2026</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
