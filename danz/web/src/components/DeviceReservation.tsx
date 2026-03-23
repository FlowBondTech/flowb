'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import {
  FiActivity,
  FiBattery,
  FiBluetooth,
  FiDroplet,
  FiStar,
  FiTarget,
  FiZap,
} from 'react-icons/fi'

const specs = [
  { icon: FiDroplet, label: 'Water Resistant', value: 'IPX7 Rating' },
  { icon: FiBattery, label: '7 Day Battery', value: 'Long Life' },
  { icon: FiBluetooth, label: 'Bluetooth 5.0', value: 'Fast Sync' },
]

const features = [
  {
    icon: FiActivity,
    title: 'Movement Tracking',
    description: 'Advanced sensors capture every dance move with precision',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: FiZap,
    title: 'Real-Time Sync',
    description: 'Instant synchronization with the DANZ mobile app',
    gradient: 'from-pink-500 to-red-500',
  },
  {
    icon: FiTarget,
    title: 'Precision Technology',
    description: 'Military-grade motion sensing for perfect accuracy',
    gradient: 'from-blue-500 to-purple-500',
  },
  {
    icon: FiStar,
    title: 'Premium Design',
    description: 'Sleek, comfortable design built for dancers',
    gradient: 'from-yellow-500 to-orange-500',
  },
]

export default function DeviceReservation() {
  const { isAuthenticated, login } = useAuth()
  const router = useRouter()

  const handleJoinCommunity = () => {
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      login()
    }
  }

  return (
    <section
      id="device"
      className="section bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        {/* Coming Soon Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium">
            <FiZap className="mr-2" />
            Coming Q4 2025
          </span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          {/* Left: Device Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              <span className="gradient-text gradient-text-animate">FlowBond</span>
              <br />
              <span className="text-3xl md:text-4xl text-text-primary">Technology</span>
            </h2>
            <p className="text-lg text-text-secondary mb-10 leading-relaxed">
              Experience revolutionary movement tracking with our next-generation wearable device.
              FlowBond captures every nuance of your dance, providing real-time feedback and
              unprecedented insights into your performance.
            </p>

            {/* Specs with icons */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {specs.map((spec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center hover:bg-bg-card/50 transition-all"
                >
                  <spec.icon className="w-6 h-6 text-neon-purple mx-auto mb-2" />
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                    {spec.label}
                  </div>
                  <div className="text-sm font-semibold text-text-primary">{spec.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-bg-card/50 hover:border-white/20 transition-all group"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-6 h-6 text-text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold gradient-text mb-1">Reserve Yours Now</p>
                  <p className="text-text-secondary">Limited early bird pricing available</p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinCommunity}
                  className="bg-gradient-neon text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-neon-purple/50 transition-all"
                >
                  {isAuthenticated ? 'Reserve Your Device' : 'Join the Community'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Device Visual with Animated Rings */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center lg:pl-12"
          >
            <div className="relative w-96 h-96">
              {/* Glow effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full blur-3xl animate-pulse" />
              </div>

              {/* Animated Rings */}
              {[1, 2, 3].map(ring => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 border border-neon-purple/20 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.05, 0.3],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4 + ring,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: ring * 0.7,
                    ease: 'easeInOut',
                  }}
                />
              ))}

              {/* Central Device */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 30,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  }}
                  className="relative"
                >
                  <div className="w-40 h-40 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-purple rounded-3xl flex items-center justify-center shadow-2xl shadow-neon-purple/50 relative overflow-hidden">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

                    {/* Device screen */}
                    <div className="w-32 h-32 bg-black/30 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
                      <div className="relative">
                        <FiActivity className="w-12 h-12 text-text-primary" />
                        {/* Pulse effect */}
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [1, 0, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        >
                          <FiActivity className="w-12 h-12 text-text-primary/50" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating Data Points */}
              {[
                { x: '15%', y: '20%', delay: 0 },
                { x: '75%', y: '15%', delay: 0.5 },
                { x: '80%', y: '70%', delay: 1 },
                { x: '20%', y: '75%', delay: 1.5 },
              ].map((pos, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full shadow-lg shadow-neon-purple/50"
                  style={{
                    left: pos.x,
                    top: pos.y,
                  }}
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: pos.delay,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
