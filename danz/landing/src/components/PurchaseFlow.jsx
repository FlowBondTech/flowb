import React, { useState } from 'react'
// Removed Privy auth, Supabase, and payment agents
import './PurchaseFlow.css'

const PurchaseFlow = ({ isOpen, onClose }) => {
  // Removed Privy auth and complex purchase flow
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Removed complex product loading and auth effects
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Simple email signup simulation
      console.log('Waitlist signup:', { email, timestamp: new Date().toISOString() })
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setEmail('')
      }, 3000)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="purchase-modal-overlay" onClick={onClose}>
      <div className="purchase-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        {!success ? (
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="gradient-text">Join the DANZ Waitlist</h2>
              <p>Be the first to know when DANZ launches. Get early access and exclusive updates.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="waitlist-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                  required
                />
              </div>
              
              {error && <p className="error-message">{error}</p>}
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
            
            <div className="waitlist-benefits">
              <h3>What you'll get:</h3>
              <ul>
                <li>Early access to the DANZ app</li>
                <li>Exclusive launch bonuses</li>
                <li>FlowBond device pre-order opportunities</li>
                <li>Community event invitations</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="success-content">
            <div className="success-icon">🎉</div>
            <h2 className="gradient-text">Welcome to DANZ!</h2>
            <p>You're now on our waitlist. Check your email for updates and early access information.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PurchaseFlow
      loadProducts()
    }
  }, [isOpen])

  useEffect(() => {
    if (products && products.length > 0) {
      if (initialProduct) {
        const product = products.find(p => p.id === initialProduct)
        if (product) {
          setSelectedProduct(product)
          setSelectedPaymentOption(product.paymentOptions[0])
        }
      } else {
        // Default to device or first product
        const device = products.find(p => 
          p.id === 'flowbond-device' || 
          p.id?.includes('device') || 
          p.category === 'hardware'
        ) || products[0]
        setSelectedProduct(device)
        setSelectedPaymentOption(device?.paymentOptions[0])
      }
    }
  }, [initialProduct, products])

  if (!isOpen) return null

  const handleProductSwitch = (product) => {
    setSelectedProduct(product)
    setSelectedPaymentOption(product.paymentOptions[0])
    setError(null)
    setShowAllProducts(false)
  }

  const handlePurchase = async () => {
    if (!authenticated) {
      // Trigger Privy login first
      login()
      return
    }

    if (!selectedProduct || !selectedPaymentOption) {
      setError('Please select a payment option')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user email from Privy agent
      const userEmail = privyAgent.getUserEmail()
      const userId = privyAgent.getUserId()
      
      // Save purchase intent to Supabase
      const { data: purchaseData, error: dbError } = await supabase
        .from('purchase_intents')
        .insert({
          user_id: userId,
          email: userEmail,
          product_id: `${selectedProduct.id}_${selectedPaymentOption.id}`,
          product_name: `${selectedProduct.name} - ${selectedPaymentOption.label}`,
          price: selectedPaymentOption.price,
          status: 'pending'
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        // Continue anyway - we can still process the payment
      }

      // Get the Stripe price ID
      const stripePriceId = selectedPaymentOption.stripePriceId || selectedPaymentOption.id
      
      // Check if we have a valid price ID
      if (!stripePriceId) {
        setError('Product pricing not configured. Please try again later.')
        setLoading(false)
        return
      }

      // For testing, log the price ID
      console.log('Attempting checkout with price ID:', stripePriceId)
      
      // Redirect to Stripe Checkout
      await stripeAgent.redirectToCheckout({
        priceId: stripePriceId,
        mode: selectedPaymentOption.type === 'subscription' ? 'subscription' : 'payment',
        customerEmail: userEmail,
        metadata: {
          userId: userId,
          productId: selectedProduct.id,
          optionId: selectedPaymentOption.id,
          purchaseIntentId: purchaseData?.id
        }
      })
      
      // If we get here, checkout redirect should have happened
      // The page will redirect to Stripe
    } catch (err) {
      console.error('Purchase error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const otherProduct = products.find(p => p.id !== selectedProduct?.id)

  return (
    <div className="purchase-modal-overlay" onClick={onClose}>
      <div className="purchase-modal elegant" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        
        {loadingProducts ? (
          <div className="loading-products">
            <div className="pulse-loader">
              <div className="pulse"></div>
              <div className="pulse"></div>
              <div className="pulse"></div>
            </div>
            <p>Loading payment options...</p>
          </div>
        ) : selectedProduct ? (
          <div className="product-focus-view">
            <div className="modal-header">
              {selectedProduct.recommended && (
                <span className="recommended-pill">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L10.163 5.379L15 6.049L11.5 9.451L12.326 14.265L8 12L3.674 14.265L4.5 9.451L1 6.049L5.837 5.379L8 1Z" fill="currentColor"/>
                  </svg>
                  RECOMMENDED
                </span>
              )}
              <h2 className="modal-title gradient-text">{selectedProduct.name}</h2>
              <p className="modal-subtitle">{selectedProduct.description}</p>
            </div>

            <div className="payment-section">
              <div className="section-header">
                <h3 className="section-title">Payment Options</h3>
                <span className="secure-badge">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1C3.5 1 3 2.5 3 2.5V4H2V11H10V4H9V2.5C9 2.5 8.5 1 6 1Z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.3"/>
                  </svg>
                  Secure Checkout
                </span>
              </div>
              <div className="payment-cards">
                {selectedProduct.paymentOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`payment-card ${selectedPaymentOption?.id === option.id ? 'active' : ''}`}
                    onClick={() => setSelectedPaymentOption(option)}
                  >
                    <div className="card-header">
                      {option.badge && <span className="card-badge">{option.badge}</span>}
                      <div className="card-selector">
                        <div className={`radio-button ${selectedPaymentOption?.id === option.id ? 'checked' : ''}`}>
                          {selectedPaymentOption?.id === option.id && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="price-display">
                        <span className="currency">$</span>
                        <span className="amount">{option.price}</span>
                        <span className="period">{option.type === 'subscription' ? `/${option.interval}` : ''}</span>
                      </div>
                      <p className="price-label">{option.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedProduct.features && selectedProduct.features.length > 0 && (
              <div className="features-section">
                <h3 className="section-title">What's Included</h3>
                <div className="features-grid">
                  {selectedProduct.features.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <div className="feature-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                          <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="feature-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherProduct && (
              <div className="cross-sell-banner">
                <div className="banner-content">
                  <div className="banner-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L12 7L17 7.5L13.5 11L14.5 16L10 13.5L5.5 16L6.5 11L3 7.5L8 7L10 2Z" fill="var(--neon-purple)" opacity="0.3"/>
                      <path d="M10 2L12 7L17 7.5L13.5 11L14.5 16L10 13.5L5.5 16L6.5 11L3 7.5L8 7L10 2Z" stroke="var(--neon-purple)" strokeWidth="1"/>
                    </svg>
                  </div>
                  <div className="banner-text">
                    <strong>Complete Your Experience</strong>
                    <p>Add {otherProduct.name} for maximum rewards</p>
                  </div>
                  <button 
                    className="banner-action"
                    onClick={() => handleProductSwitch(otherProduct)}
                  >
                    View →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-products">
            <p>No products available</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="modal-footer">
          <div className="payment-info">
            <span className="payment-methods">
              <svg width="24" height="16" viewBox="0 0 24 16" fill="none" opacity="0.6">
                <rect x="1" y="3" width="22" height="10" rx="2" stroke="currentColor" strokeWidth="1"/>
                <path d="M1 7H23" stroke="currentColor" strokeWidth="1"/>
              </svg>
              <svg width="24" height="16" viewBox="0 0 24 16" fill="none" opacity="0.6">
                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1"/>
                <circle cx="16" cy="8" r="5" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </span>
            <span className="secure-text">Powered by Stripe</span>
          </div>
          <div className="action-buttons">
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn-primary purchase-cta"
              onClick={handlePurchase}
              disabled={loading || !selectedPaymentOption}
            >
              {loading ? (
                <span className="loading-state">
                  <span className="spinner"></span>
                  Processing...
                </span>
              ) : authenticated ? (
                <span className="ready-state">
                  {selectedPaymentOption ? (
                    <>Continue to Payment <span className="price-tag">${selectedPaymentOption.price}</span></>
                  ) : (
                    'Select an option'
                  )}
                </span>
              ) : (
                'Login to Purchase'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurchaseFlow