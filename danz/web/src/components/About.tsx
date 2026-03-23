'use client'
import { motion } from 'motion/react'
import { FiDollarSign, FiSmartphone, FiWatch } from 'react-icons/fi'

const companyPillars = [
  {
    title: 'The App',
    subtitle: 'Your Movement Companion',
    description:
      'Track your rhythm, discover events, and connect with dancers in your city. Available on iOS and Android.',
    icon: FiSmartphone,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    title: 'The Wearable',
    subtitle: 'Track Every Beat',
    description:
      'Our DANZ NOW bracelet (powered by FlowBond technology) captures your movement data and automatically rewards your activity.',
    icon: FiWatch,
    gradient: 'from-pink-500 to-red-500',
  },
  {
    title: 'The Token',
    subtitle: 'Movement Rewards',
    description:
      '$DANZ is our reward token that you earn for dancing, attending events, and building community.',
    icon: FiDollarSign,
    gradient: 'from-red-500 to-orange-500',
  },
]

export default function About() {
  return (
    <section id="about" className="section bg-bg-secondary/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-neon-purple text-sm font-medium uppercase tracking-wider mb-4 block">
            About DANZ NOW
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Where Movement Meets <span className="gradient-text">Technology</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            DANZ NOW is a movement tech platform building the future of community-driven wellness,
            powered by FlowBond technology.
            <br />
            We reward authentic movement and meaningful connections.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {companyPillars.map((pillar, index) => (
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
              whileHover={{
                y: -10,
                transition: { duration: 0.3 },
              }}
              className="group cursor-pointer"
            >
              <div className="process-card card-hover bg-bg-card border border-white/5 rounded-xl p-8 h-full relative overflow-hidden">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                <div className="relative z-10">
                  <div
                    className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${pillar.gradient} rounded-xl mb-6 shadow-lg`}
                  >
                    <pillar.icon className="w-8 h-8 text-text-primary" />
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-2 relative z-10">{pillar.title}</h3>
                <h4 className="text-lg text-neon-purple mb-4 relative z-10">{pillar.subtitle}</h4>
                <p className="text-text-secondary relative z-10">{pillar.description}</p>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
