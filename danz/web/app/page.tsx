import About from '@/src/components/About'
import CTA from '@/src/components/CTA'
import DeviceReservation from '@/src/components/DeviceReservation'
import FAQ from '@/src/components/FAQ'
import FlowHostSection from '@/src/components/FlowHostSection'
import Footer from '@/src/components/Footer'
import ForDancers from '@/src/components/ForDancers'
import ForHosts from '@/src/components/ForHosts'
import Hero from '@/src/components/Hero'
import HowItWorks from '@/src/components/HowItWorks'
import Layout from '@/src/components/Layout'
import Navbar from '@/src/components/Navbar'
import SubscriptionSection from '@/src/components/SubscriptionSection'
import TokenIntroduction from '@/src/components/TokenIntroduction'
import UpcomingEvents from '@/src/components/UpcomingEvents'

export default function Home() {
  return (
    <Layout>
      <Navbar />
      <main className="pt-20">
        <Hero />
        <UpcomingEvents />
        <HowItWorks />
        <ForDancers />
        <ForHosts />
        <DeviceReservation />
        <About />
        <TokenIntroduction />
        <SubscriptionSection />
        <FlowHostSection />
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </Layout>
  )
}
