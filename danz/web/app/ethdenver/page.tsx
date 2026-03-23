'use client'

import Footer from '@/src/components/Footer'
import Layout from '@/src/components/Layout'
import Navbar from '@/src/components/Navbar'
import ETHDenverPage from '@/src/components/ethdenver/ETHDenverPage'

export default function ETHDenverRoute() {
  return (
    <Layout>
      <Navbar />
      <main>
        <ETHDenverPage />
      </main>
      <Footer />
    </Layout>
  )
}
