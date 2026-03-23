'use client'
import { motion } from 'motion/react'

const hostFeatures = [
  {
    icon: '🎪',
    title: 'Host Memorable Events',
    description: 'Create dance events, workshops, and battles that bring communities together.',
  },
  {
    icon: '💰',
    title: 'Monetize Your Space',
    description: 'Earn from ticket sales, sponsorships, and $DANZ token rewards.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Track attendance, engagement, and earnings with detailed insights.',
  },
  {
    icon: '🤝',
    title: 'Build Your Network',
    description: 'Connect with dancers, sponsors, and other event organizers.',
  },
]

const hostTypes = [
  {
    title: 'Studio Owners',
    description: 'Transform your dance studio into a hub for the DANZ community.',
    icon: '🏢',
  },
  {
    title: 'Event Organizers',
    description: 'Host dance battles, workshops, and social events.',
    icon: '🎭',
  },
  {
    title: 'Fitness Instructors',
    description: 'Lead movement classes and earn from every participant.',
    icon: '💪',
  },
  {
    title: 'Community Leaders',
    description: 'Organize local dance meetups and grow your influence.',
    icon: '👥',
  },
]

export default function ForHosts() {
  return (
    <section id="hosts" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="section-tag inline-block bg-gradient-neon text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            For Hosts
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Empower Your Community</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Become a DANZ.NOW host and create unforgettable movement experiences while earning
            rewards.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {hostFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center group hover:border-white/20 hover:bg-bg-card/40 transition-all duration-300"
            >
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-text-primary">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h3 className="text-3xl font-display font-bold text-center mb-12">Perfect For</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {hostTypes.map((type, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-bg-card/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center group hover:border-white/20 hover:bg-bg-card/40 transition-all duration-300"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                    {type.icon}
                  </div>
                </div>
                <h4 className="text-xl font-semibold mb-4 text-text-primary">{type.title}</h4>
                <p className="text-text-secondary leading-relaxed">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-br from-neon-purple/10 via-transparent to-neon-pink/10 backdrop-blur-sm border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-block mb-6"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">🎉</span>
                </div>
              </motion.div>

              <h3 className="text-3xl md:text-4xl font-display font-bold mb-6 gradient-text">
                Ready to Host Your First Event?
              </h3>

              <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
                Join our exclusive host program and unlock powerful tools to grow your dance
                community
              </p>

              <div className="flex justify-center mb-10">
                <div className="grid md:grid-cols-2 gap-4 max-w-2xl w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-text-primary text-left">
                      Free event promotion platform
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-text-primary text-left">
                      Global dancer network access
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-text-primary text-left">
                      Professional management tools
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="text-text-primary text-left">Priority support & training</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-neon text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-neon-purple/50 transition-all"
                >
                  Apply to Become a Host
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all"
                >
                  Learn More
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
