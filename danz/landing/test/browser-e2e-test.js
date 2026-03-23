#!/usr/bin/env node

/**
 * End-to-End Browser Test for DANZ Landing Page
 * Tests the redesigned device features and payment flows
 */

import puppeteer from 'puppeteer';
import chalk from 'chalk';

const APP_URL = 'http://localhost:5176';
const API_URL = 'http://localhost:3001';

class E2ETestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async setup() {
    console.log(chalk.cyan('\n🚀 Starting E2E Browser Tests...\n'));
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(chalk.red('Browser error:'), msg.text());
      }
    });
    
    // Set up network monitoring
    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(chalk.gray(`  API: ${response.status()} ${response.url()}`));
      }
    });
  }

  async runTest(name, testFn) {
    try {
      console.log(chalk.yellow(`\n📝 ${name}`));
      await testFn();
      console.log(chalk.green(`  ✅ Passed`));
      this.testResults.push({ name, passed: true });
    } catch (error) {
      console.log(chalk.red(`  ❌ Failed: ${error.message}`));
      this.testResults.push({ name, passed: false, error: error.message });
    }
  }

  async testHomepageLoads() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    const title = await this.page.title();
    if (!title.includes('DANZ')) {
      throw new Error(`Expected title to contain 'DANZ', got: ${title}`);
    }
  }

  async testDeviceFeaturesStrip() {
    // Check that the new feature strip is visible
    const featureStrip = await this.page.$('.device-features-strip');
    if (!featureStrip) {
      throw new Error('Device features strip not found');
    }
    
    // Check all three features are present
    const features = await this.page.$$eval('.feature-item span', els => 
      els.map(el => el.textContent)
    );
    
    const expectedFeatures = ['Water Resistant', '7 Day Battery', 'Bluetooth 5.0'];
    for (const feature of expectedFeatures) {
      if (!features.includes(feature)) {
        throw new Error(`Feature "${feature}" not found in strip`);
      }
    }
    
    // Check that old floating badges are NOT present
    const floatingBadges = await this.page.$$('.device-floating-badge');
    if (floatingBadges.length > 0) {
      throw new Error('Old floating badges still present - should be removed');
    }
    
    console.log(chalk.gray(`    Found features: ${features.join(', ')}`));
  }

  async testDeviceReservationSection() {
    // Scroll to device section
    await this.page.evaluate(() => {
      document.querySelector('#device')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check package cards
    const packageCards = await this.page.$$('.package-card');
    if (packageCards.length !== 2) {
      throw new Error(`Expected 2 package cards, found ${packageCards.length}`);
    }
    
    // Check popular badge
    const popularBadge = await this.page.$('.popular-badge');
    if (!popularBadge) {
      throw new Error('Popular badge not found on second package');
    }
    
    // Check prices
    const prices = await this.page.$$eval('.price-amount', els => 
      els.map(el => el.textContent)
    );
    if (!prices.includes('99') || !prices.includes('149')) {
      throw new Error(`Incorrect prices found: ${prices.join(', ')}`);
    }
  }

  async testReservationModalFlow() {
    // Click reserve button for first package
    const reserveBtn = await this.page.$('.package-card:first-child .btn-primary');
    if (!reserveBtn) {
      throw new Error('Reserve button not found');
    }
    
    await reserveBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if Privy login modal appears (since not authenticated)
    // Or check if our reservation modal appears
    const modalVisible = await this.page.evaluate(() => {
      const privyModal = document.querySelector('[data-privy-modal]');
      const reservationModal = document.querySelector('.subscription-modal-overlay');
      return privyModal || reservationModal;
    });
    
    if (!modalVisible) {
      throw new Error('No modal appeared after clicking reserve');
    }
    
    console.log(chalk.gray('    Modal interaction working'));
  }

  async testAPIConnection() {
    // Test API connection
    const response = await this.page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(`${apiUrl}/api/test-connection`);
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    }, API_URL);
    
    if (response.error) {
      throw new Error(`API connection failed: ${response.error}`);
    }
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    console.log(chalk.gray('    API connection successful'));
  }

  async testStripeProductFetch() {
    // Test fetching Stripe products
    const products = await this.page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(`${apiUrl}/api/stripe-products`);
        const data = await res.json();
        return data;
      } catch (error) {
        return { error: error.message };
      }
    }, API_URL);
    
    if (products.error) {
      throw new Error(`Failed to fetch products: ${products.error}`);
    }
    
    if (!products.products || products.products.length === 0) {
      throw new Error('No products returned from API');
    }
    
    console.log(chalk.gray(`    Found ${products.products.length} products with ${products.products.reduce((acc, p) => acc + p.prices.length, 0)} price points`));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      
      // Run all tests
      await this.runTest('Homepage loads correctly', () => this.testHomepageLoads());
      await this.runTest('Device features strip displays correctly', () => this.testDeviceFeaturesStrip());
      await this.runTest('Device reservation section renders', () => this.testDeviceReservationSection());
      await this.runTest('Reservation modal flow works', () => this.testReservationModalFlow());
      await this.runTest('API connection works', () => this.testAPIConnection());
      await this.runTest('Stripe products fetch successfully', () => this.testStripeProductFetch());
      
      // Print summary
      console.log(chalk.cyan('\n📊 Test Summary:\n'));
      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      
      console.log(chalk.green(`  ✅ Passed: ${passed}`));
      if (failed > 0) {
        console.log(chalk.red(`  ❌ Failed: ${failed}`));
        console.log(chalk.red('\nFailed tests:'));
        this.testResults.filter(r => !r.passed).forEach(r => {
          console.log(chalk.red(`  - ${r.name}: ${r.error}`));
        });
      }
      
      console.log(chalk.cyan('\n✨ E2E Testing Complete!\n'));
      
    } catch (error) {
      console.error(chalk.red('Test runner error:'), error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
const runner = new E2ETestRunner();
runner.run().catch(console.error);