'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

const faqs = [
  {
    question: 'What is DANZ NOW?',
    answer:
      'DANZ NOW is a revolutionary platform that combines wearable technology (powered by FlowBond) with blockchain to reward users for physical movement and dance.',
  },
  {
    question: 'How do I earn $DANZ?',
    answer:
      'Simply wear the DANZ NOW device while dancing or moving. The device tracks your activity and automatically converts it to $DANZ tokens.',
  },
  {
    question: 'Is it available worldwide?',
    answer:
      'Yes! DANZ NOW is a global platform. You can dance and earn anywhere in the world with an internet connection.',
  },
  {
    question: 'When does it launch?',
    answer:
      "We're launching in Q4 2025. Join our community to get early access and exclusive launch bonuses.",
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="section-tag inline-block bg-gradient-neon text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            Support
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="mb-4"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left card hover:bg-bg-hover transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                  <FiChevronDown
                    className={`w-5 h-5 text-text-muted transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-text-secondary mt-4 pt-4 border-t border-white/5">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
