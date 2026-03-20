import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, viewportConfig } from '../hooks/useMotion'

const faqs = [
  {
    question: 'What is DANZ.NOW?',
    answer: 'DANZ.NOW is an app that connects dancers with events, communities, and each other. Find dance events near you, track your sessions, and be part of a global dance movement.'
  },
  {
    question: 'How do I get rewarded?',
    answer: 'Simply dance! Attend events, complete challenges, and stay active in the community. The more you move, the more you earn.'
  },
  {
    question: 'Is it available in my city?',
    answer: "We're launching in Bali, Austin, and Tulum first (Q4 2025), then expanding worldwide. Join the waitlist to be notified when we come to your area."
  },
  {
    question: 'Do I need special equipment?',
    answer: "Nope! Just download the app on your phone and start exploring events. That's it."
  },
  {
    question: 'Can I host events on DANZ.NOW?',
    answer: "Yes! If you're a studio owner, instructor, or event organizer, you can apply to become a host and promote your events to our dance community."
  }
]

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <motion.div
      className={`faq-accordion-item ${isOpen ? 'faq-open' : ''}`}
      variants={fadeInUp}
    >
      <button className="faq-accordion-trigger" onClick={onToggle}>
        <h3>{faq.question}</h3>
        <motion.span
          className="faq-accordion-icon"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="faq-accordion-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="section faq-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <span className="section-tag">Questions?</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </motion.div>
        <motion.div
          className="faq-accordion"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FAQ
