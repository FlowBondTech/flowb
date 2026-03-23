'use client'

import { motion } from 'motion/react'
import { FiCalendar, FiDollarSign, FiGlobe, FiStar, FiTrendingUp, FiUsers } from 'react-icons/fi'

const hostBenefits = [
  {
    icon: FiDollarSign,
    title: 'Earn Revenue',
    description: 'Keep 80% of event revenue plus bonus rewards for popular events',
    gradient: 'from-pink-500 to-purple-500',
  },
  {
    icon: FiUsers,
    title: 'Build Community',
    description: 'Connect with dancers worldwide and grow your following',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    icon: FiCalendar,
    title: 'Flexible Scheduling',
    description: 'Host events on your schedule, from your location',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FiTrendingUp,
    title: 'Analytics Dashboard',
    description: 'Track your performance and optimize your events',
    gradient: 'from-cyan-500 to-green-500',
  },
  {
    icon: FiStar,
    title: 'Exclusive Tools',
    description: 'Access premium hosting features and promotional tools',
    gradient: 'from-green-500 to-yellow-500',
  },
  {
    icon: FiGlobe,
    title: 'Global Reach',
    description: 'Reach dancers from around the world with virtual events',
    gradient: 'from-yellow-500 to-pink-500',
  },
]

const steps = [
  {
    number: '01',
    title: 'Apply to Join',
    description: 'Submit your application with your dance background and teaching experience',
    gradient: 'from-pink-500 to-purple-500',
  },
  {
    number: '02',
    title: 'Get Verified',
    description: 'Complete our verification process and set up your FlowHost profile',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    number: '03',
    title: 'Start Hosting',
    description: 'Create your first event and start building your dance community',
    gradient: 'from-blue-500 to-cyan-500',
  },
]

export default function FlowHostSection() {
  return (
    <section className="section bg-bg-primary">
      <div className="container">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Become a <span className="gradient-text">FlowHost</span>
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Share your passion for dance and earn while you teach. Join our community of
              professional FlowHosts and turn your skills into sustainable income.
            </p>
          </motion.div>
        </div>

        {/* Hero Stats */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
        >
          {[
            { value: '10K+', label: 'Active Hosts' },
            { value: '$2M+', label: 'Host Earnings' },
            { value: '50K+', label: 'Events Hosted' },
            { value: '4.9★', label: 'Average Rating' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-text-secondary text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div> */}

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {hostBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="relative inline-block mb-6"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  <benefit.icon className="w-8 h-8 text-text-primary" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-text-secondary">{benefit.description}</p>

              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            </motion.div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl font-bold mb-4">How to Become a FlowHost</h3>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Join thousands of dance professionals who are already earning with DANZ
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 text-center relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-full text-white font-bold text-2xl shadow-lg mb-6`}
                  >
                    {step.number}
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{step.title}</h4>
                  <p className="text-text-secondary">{step.description}</p>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                </div>

                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                    className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-white/20 to-white/10 origin-left transform -translate-y-1/2"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 border border-white/10 rounded-2xl p-8 md:p-12 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Earning?</h3>
            <p className="text-text-secondary mb-8 text-lg">
              Join our community of FlowHosts and turn your passion into profit. Applications are
              reviewed within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button type="button" className="btn btn-primary">
                Apply to Become a FlowHost
              </button>
              <button type="button" className="btn btn-secondary">
                Learn More
              </button>
            </div>

            <div className="mt-8 text-sm text-text-muted">
              <p>✓ No upfront costs ✓ Keep 80% of earnings ✓ Full support provided</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
