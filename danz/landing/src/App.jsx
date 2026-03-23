import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
// For GitHub Pages, uncomment the line below and comment the line above:
// import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ShowcaseSection from './components/ShowcaseSection'
import ForDancers from './components/ForDancers'
import TickerSection from './components/TickerSection'
import ForHosts from './components/ForHosts'
import About from './components/About'
import HowItWorks from './components/HowItWorks'
import CTA from './components/CTA'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import Danz from './components/Danz'
import Tokenomics from './components/Tokenomics'
import ReservationSuccess from './components/ReservationSuccess'
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'
import PrivacyPolicySimple from './components/PrivacyPolicySimple'
import TermsOfServiceSimple from './components/TermsOfServiceSimple'

function HomePage() {
  return (
    <>
      <Hero />
      <ShowcaseSection />
      <HowItWorks />
      <ForDancers />
      <TickerSection />
      <ForHosts />
      <About />
      <CTA />
      <FAQ />
    </>
  )
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/danz" element={<Danz />} />
          <Route path="/tokenomics" element={<Tokenomics />} />
          <Route path="/privacy-policy" element={<PrivacyPolicySimple />} />
          <Route path="/terms-of-service" element={<TermsOfServiceSimple />} />
          <Route path="/reservation-success" element={<ReservationSuccess />} />
        </Routes>
        <Footer />
      </Layout>
    </Router>
  )
}

export default App