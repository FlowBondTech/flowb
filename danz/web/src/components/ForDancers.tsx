'use client'
import { motion } from 'motion/react'
import { FiCheck } from 'react-icons/fi'

const features = [
  {
    icon: '💃',
    title: 'Earn While You Dance',
    description: 'Every move counts. Earn $DANZ tokens automatically with the FlowBond tracker.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🎯',
    title: 'Track Your Progress',
    description: 'Monitor your dance sessions, calories burned, and earnings in real-time.',
    gradient: 'from-pink-500 to-red-500',
  },
  {
    icon: '🏆',
    title: 'Join Challenges',
    description: 'Compete in global dance challenges and earn bonus rewards.',
    gradient: 'from-red-500 to-orange-500',
  },
  {
    icon: '🌍',
    title: 'Connect Globally',
    description: 'Join a worldwide community of dancers and movement enthusiasts.',
    gradient: 'from-orange-500 to-yellow-500',
  },
]

const benefits = [
  'No expensive equipment needed - just your phone and FlowBond device',
  'Dance anywhere, anytime - at home, studio, or events',
  'Convert your earnings to real money or exclusive perks',
  'Get discovered by event hosts and choreographers',
]

export default function ForDancers() {
  return (
    <section id="dancers" className="section bg-bg-secondary/50 relative overflow-hidden">
      {/* Animated background gradients */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'linear',
        }}
        className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-neon-purple/10 to-transparent rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 25,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'linear',
        }}
        className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-neon-pink/10 to-transparent rounded-full blur-3xl"
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-neon-purple text-sm font-medium uppercase tracking-wider mb-4 block">
            For Dancers
          </span>
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: 'spring' }}
          >
            Turn Your Passion Into{' '}
            <span className="gradient-text gradient-text-animate">Rewards</span>
          </motion.h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Whether you're a professional dancer or just love to move, DANZ.NOW rewards every step,
            spin, and groove.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
              className="group"
            >
              <div className="feature-card bg-bg-card border border-white/5 rounded-xl p-6 h-full relative overflow-hidden text-center">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                <motion.div
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="text-5xl mb-4 relative z-10"
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2 relative z-10 group-hover:text-neon-purple transition-colors">
                  {feature.title}
                </h3>
                <p className="text-text-secondary relative z-10">{feature.description}</p>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-12">
              Why Dancers Love <span className="gradient-text">DANZ.NOW</span>
            </h3>
            <ul className="space-y-6 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 text-left"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-neon rounded-full flex items-center justify-center mt-0.5">
                    <FiCheck className="w-4 h-4 text-text-primary" />
                  </div>
                  <span className="text-text-secondary leading-relaxed text-lg">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
