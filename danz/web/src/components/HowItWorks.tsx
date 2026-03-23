'use client'
import { motion } from 'motion/react'
import { FiActivity, FiDollarSign, FiDownload, FiUsers } from 'react-icons/fi'

const steps = [
  {
    number: '01',
    icon: FiDownload,
    title: 'Download the App',
    description: 'Get the DANZ NOW app and create your profile to start earning',
    gradient: 'from-pink-500 to-purple-500',
    iconBg: 'bg-gradient-to-br from-pink-500 to-purple-500',
  },
  {
    number: '02',
    icon: FiActivity,
    title: 'Move Your Way',
    description: 'Dance, walk, yoga, or any movement you love. Every step counts toward rewards',
    gradient: 'from-purple-500 to-blue-500',
    iconBg: 'bg-gradient-to-br from-purple-500 to-blue-500',
  },
  {
    number: '03',
    icon: FiDollarSign,
    title: 'Earn Rewards',
    description: 'Automatically receive $DANZ tokens for your activity and event participation',
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  },
  {
    number: '04',
    icon: FiUsers,
    title: 'Join Events',
    description: 'Connect with your local dance community and discover events that match your vibe',
    gradient: 'from-cyan-500 to-pink-500',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section relative overflow-hidden bg-bg-primary">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-purple/5 to-transparent" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-white bg-gradient-to-r from-pink-500 to-purple-500 text-sm font-medium px-4 py-2 rounded-full mb-6">
            Simple Process
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
            How <span className="gradient-text gradient-text-animate">DANZ NOW</span> Works
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Get started in minutes and begin earning rewards for the movement you're already doing.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                type: 'spring',
                stiffness: 100,
              }}
              className="relative"
            >
              <div className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 h-full text-center relative overflow-hidden group hover:border-white/20 hover:bg-bg-card/40 transition-all duration-300">
                {/* Step number - positioned at top left */}
                <div className="absolute top-6 left-6">
                  <span
                    className={`text-2xl font-bold bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent`}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Icon - larger and centered */}
                <div className="flex justify-center mb-8 mt-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className={`w-24 h-24 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center shadow-xl`}
                  >
                    <step.icon className="w-12 h-12 text-text-primary" />
                  </motion.div>
                </div>

                {/* Step title */}
                <h3 className="text-xl font-semibold mb-4 text-text-primary">{step.title}</h3>

                {/* Step description */}
                <p className="text-text-secondary text-sm leading-relaxed px-2">
                  {step.description}
                </p>

                {/* Animated connection line (for desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                      className="h-[2px] bg-gradient-to-r from-white/10 to-transparent origin-left"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          className="absolute -left-20 bottom-20 w-40 h-40 bg-neon-purple/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          className="absolute -right-20 top-20 w-40 h-40 bg-neon-pink/10 rounded-full blur-3xl"
        />
      </div>
    </section>
  )
}
