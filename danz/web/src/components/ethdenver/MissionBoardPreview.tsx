'use client'

import { previewMissions } from '@/src/components/ethdenver/data'
import { motion } from 'motion/react'

function MissionStatus({ status }: { status: string }) {
  if (status === 'completed')
    return (
      <div className="w-5 h-5 rounded-full bg-neon-purple flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  if (status === 'active') return <span className="text-xs font-medium text-neon-pink">Active</span>
  return (
    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )
}

export default function MissionBoardPreview() {
  return (
    <section
      id="preview"
      className="section bg-gradient-to-b from-bg-primary via-bg-secondary/20 to-bg-primary relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium uppercase tracking-wider mb-8">
              App Preview
            </span>

            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              What Users <span className="gradient-text">See</span>
            </h2>

            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              The mission board lives in the DANZ app. Attendees browse available missions, track
              progress, and earn $DANZ tokens as they complete challenges throughout the week.
            </p>

            <div className="space-y-4">
              {[
                'Swipe through available missions by category',
                'Real-time XP tracking and leaderboard position',
                'QR scan and location check-in for verification',
                'FlowBond wearable auto-verification for dance missions',
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-neon-purple flex-shrink-0" />
                  <span className="text-text-secondary">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-[280px] md:w-[320px] bg-bg-card/80 backdrop-blur-sm border-2 border-white/20 rounded-[40px] p-3 shadow-2xl shadow-neon-purple/20">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-bg-primary rounded-b-2xl" />

                {/* Screen */}
                <div className="bg-bg-primary rounded-[28px] overflow-hidden">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-5 pt-8 pb-3">
                    <span className="text-xs text-text-muted">9:41</span>
                    <span className="text-xs text-text-muted">ETHDenver</span>
                  </div>

                  {/* App Header */}
                  <div className="px-5 pb-4">
                    <h3 className="text-lg font-bold text-text-primary">Mission Board</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-[20%] bg-gradient-to-r from-neon-purple to-neon-pink rounded-full" />
                      </div>
                      <span className="text-xs text-neon-purple font-medium">100 XP</span>
                    </div>
                  </div>

                  {/* Mission List */}
                  <div className="px-3 pb-6 space-y-2">
                    {previewMissions.map(mission => (
                      <div
                        key={mission.name}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          mission.status === 'completed'
                            ? 'bg-neon-purple/10 border-neon-purple/30'
                            : mission.status === 'active'
                              ? 'bg-bg-card/50 border-white/10'
                              : 'bg-bg-card/20 border-white/5 opacity-50'
                        }`}
                      >
                        <span className="text-lg">{mission.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {mission.name}
                          </p>
                          <p className="text-xs text-text-muted">+{mission.xp} XP</p>
                        </div>
                        <MissionStatus status={mission.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow behind phone */}
              <div className="absolute -inset-8 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
