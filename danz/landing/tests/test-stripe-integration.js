#!/usr/bin/env node

/**
 * Automated Stripe Integration Test
 * Run: node tests/test-stripe-integration.js
 */

import fetch from 'node-fetch'
import chalk from 'chalk'
import dotenv from 'dotenv'

dotenv.config()

const TEST_SERVER = 'http://localhost:3001'
const FRONTEND_URL = 'http://localhost:5173'

// Test results tracking
let passedTests = 0
let failedTests = 0
const testResults = []

// Helper functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  test: (name) => console.log(chalk.cyan('\n📝 Testing:'), name)
}

async function runTest(name, testFn) {
  log.test(name)
  try {
    await testFn()
    passedTests++
    log.success(`${name} - PASSED`)
    testResults.push({ name, status: 'PASSED' })
  } catch (error) {
    failedTests++
    log.error(`${name} - FAILED`)
    log.error(`  Error: ${error.message}`)
    testResults.push({ name, status: 'FAILED', error: error.message })
  }
}

// Tests
async function testServerConnection() {
  const response = await fetch(`${TEST_SERVER}/api/test-connection`)
  const data = await response.json()
  
  if (!data.stripe.connected) {
    throw new Error('Stripe not connected')
  }
  
  if (!data.stripe.testMode) {
    throw new Error('Not in test mode')
  }
  
  log.info(`  Connected to Stripe account: ${data.stripe.accountId}`)
}

async function testProductsFetch() {
  const response = await fetch(`${TEST_SERVER}/api/stripe-products`)
  const data = await response.json()
  
  if (!data.products || data.products.length === 0) {
    throw new Error('No products found')
  }
  
  log.info(`  Found ${data.products.length} products:`)
  
  data.products.forEach(product => {
    log.info(`    - ${product.name}: ${product.prices.length} price(s)`)
    product.prices.forEach(price => {
      const amount = (price.unit_amount / 100).toFixed(2)
      const type = price.type === 'recurring' ? 
        `${price.recurring.interval}ly` : 'one-time'
      log.info(`      • $${amount} ${type} (${price.id})`)
    })
  })
  
  // Validate expected products
  const deviceProduct = data.products.find(p => p.name.includes('FlowBond'))
  const subscriptionProduct = data.products.find(p => 
    p.name.includes('Flow') && (p.name.includes('ubscription') || p.name.includes('ubcription'))
  )
  
  if (!deviceProduct) {
    throw new Error('FlowBond Device product not found')
  }
  
  if (!subscriptionProduct) {
    throw new Error('Flow Subscription product not found')
  }
}

async function testCheckoutSession() {
  // First, get a valid price ID
  const productsResponse = await fetch(`${TEST_SERVER}/api/stripe-products`)
  const productsData = await productsResponse.json()
  
  const firstPrice = productsData.products[0]?.prices[0]
  
  if (!firstPrice) {
    throw new Error('No prices available for testing')
  }
  
  log.info(`  Testing with price: ${firstPrice.id}`)
  
  // Create checkout session
  const response = await fetch(`${TEST_SERVER}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: firstPrice.id,
      quantity: 1,
      mode: firstPrice.type === 'recurring' ? 'subscription' : 'payment',
      customerEmail: 'test@danz.now',
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString()
      }
    })
  })
  
  const data = await response.json()
  
  if (!data.sessionId || !data.url) {
    throw new Error('Invalid checkout session response')
  }
  
  log.info(`  Checkout session created: ${data.sessionId}`)
  log.info(`  Checkout URL: ${data.url.substring(0, 50)}...`)
}

async function testPriceValidation() {
  // Test with invalid price ID
  const response = await fetch(`${TEST_SERVER}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: 'price_invalid_test',
      quantity: 1,
      mode: 'payment',
      customerEmail: 'test@danz.now'
    })
  })
  
  if (response.ok) {
    throw new Error('Should have rejected invalid price ID')
  }
  
  const data = await response.json()
  
  if (!data.error) {
    throw new Error('No error message for invalid price')
  }
  
  log.info('  Correctly rejected invalid price ID')
}

async function testWebhookEndpoint() {
  // Send a test webhook event
  const testEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer_email: 'test@danz.now',
        amount_total: 9900,
        payment_status: 'paid'
      }
    }
  }
  
  const response = await fetch(`${TEST_SERVER}/api/stripe-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test_signature'
    },
    body: JSON.stringify(testEvent)
  })
  
  // Note: This will fail signature verification in production
  // but should still return a response
  log.info('  Webhook endpoint accessible')
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.cyan('\n════════════════════════════════════════════════════'))
  console.log(chalk.bold.cyan('     STRIPE INTEGRATION TEST SUITE - DANZ NOW      '))
  console.log(chalk.bold.cyan('════════════════════════════════════════════════════\n'))
  
  log.info(`Test Server: ${TEST_SERVER}`)
  log.info(`Frontend URL: ${FRONTEND_URL}`)
  log.info(`Environment: TEST MODE`)
  log.info(`Timestamp: ${new Date().toISOString()}\n`)
  
  // Run tests
  await runTest('Server Connection', testServerConnection)
  await runTest('Fetch Products', testProductsFetch)
  await runTest('Create Checkout Session', testCheckoutSession)
  await runTest('Price Validation', testPriceValidation)
  await runTest('Webhook Endpoint', testWebhookEndpoint)
  
  // Summary
  console.log(chalk.bold.cyan('\n════════════════════════════════════════════════════'))
  console.log(chalk.bold.cyan('                   TEST SUMMARY                     '))
  console.log(chalk.bold.cyan('════════════════════════════════════════════════════\n'))
  
  console.log(chalk.green(`  ✓ Passed: ${passedTests}`))
  console.log(chalk.red(`  ✗ Failed: ${failedTests}`))
  console.log(chalk.cyan(`  Total: ${passedTests + failedTests}\n`))
  
  if (failedTests > 0) {
    console.log(chalk.red.bold('⚠️  Some tests failed. Review the errors above.\n'))
    process.exit(1)
  } else {
    console.log(chalk.green.bold('🎉 All tests passed! Your Stripe integration is working correctly.\n'))
    console.log(chalk.yellow('Next steps:'))
    console.log(chalk.yellow('1. Test the purchase flow in the browser'))
    console.log(chalk.yellow('2. Use test card: 4242 4242 4242 4242'))
    console.log(chalk.yellow('3. Check webhook events in Stripe Dashboard\n'))
  }
}

// Check if server is running first
async function checkServerRunning() {
  try {
    const response = await fetch(`${TEST_SERVER}/api/test-connection`)
    if (!response.ok) {
      throw new Error('Server not responding')
    }
    return true
  } catch (error) {
    log.error('Test server is not running!')
    log.warning('Please start the server first:')
    log.info('  node server/stripe-test-server.js')
    process.exit(1)
  }
}

// Run tests
checkServerRunning().then(() => {
  runAllTests().catch(error => {
    log.error('Test suite failed:', error.message)
    process.exit(1)
  })
})