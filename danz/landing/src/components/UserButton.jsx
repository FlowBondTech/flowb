import React from 'react'
// Removed Privy auth
import { motion } from 'framer-motion'

function UserButton() {
  // Simplified to just a "Notify Me" button without authentication
  const handleNotifyMe = () => {
    // Trigger waitlist modal or scroll to signup
    const event = new CustomEvent('openWaitlist')
    window.dispatchEvent(event)
  }

  return (
    <motion.button
      className="btn btn-primary notify-btn"
      onClick={handleNotifyMe}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span>Notify Me</span>
    </motion.button>
  )
}

export default UserButton