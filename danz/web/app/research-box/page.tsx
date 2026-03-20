'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import {
  FiArrowLeft,
  FiCamera,
  FiActivity,
  FiZap,
  FiUnlock,
  FiShield,
  FiCpu,
  FiWifi,
  FiBox,
  FiCheckCircle,
  FiUsers,
  FiChevronDown,
  FiEye,
  FiCreditCard,
  FiAward,
  FiMapPin,
  FiClock,
  FiPlay,
  FiStar,
  FiSpeaker,
  FiFileText,
  FiLayers,
  FiGlobe,
  FiHeart,
  FiTrendingUp,
  FiDatabase,
} from 'react-icons/fi'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CAPABILITIES = [
  {
    icon: <FiCamera className="w-7 h-7" />,
    title: 'Gaussian Splatting Capture',
    description:
      'Real-time 3D scene reconstruction from multiple camera inputs. Creates navigable volumetric memories of events.',
    color: 'neon-pink',
  },
  {
    icon: <FiActivity className="w-7 h-7" />,
    title: 'Mood Engine',
    description:
      'DMX/ArtNet lighting control, sound system integration. Environmental response driven by collective energy.',
    color: 'neon-purple',
  },
  {
    icon: <FiZap className="w-7 h-7" />,
    title: 'Flow Layer',
    description:
      'Token-gated experiences, real-time tipping via stablecoin rails, QR quests, NFT moment minting.',
    color: 'neon-blue',
  },
]

const HARDWARE_SPECS = [
  {
    icon: <FiCamera className="w-5 h-5" />,
    label: 'Capture Array',
    value: '4-6 depth cameras (Intel RealSense D455)',
    detail: '30fps sync, wide-angle + telephoto',
  },
  {
    icon: <FiCpu className="w-5 h-5" />,
    label: 'Compute Unit',
    value: 'NVIDIA Jetson Orin edge GPU',
    detail: 'ARM processor, HSM, 2TB NVMe',
  },
  {
    icon: <FiSpeaker className="w-5 h-5" />,
    label: 'Mood Engine HW',
    value: 'DMX512 / ArtNet output',
    detail: '3.5mm + XLR audio w/ DSP, optional scent diffusion',
  },
  {
    icon: <FiWifi className="w-5 h-5" />,
    label: 'Connectivity',
    value: 'WiFi 6E mesh, Bluetooth 5.3',
    detail: '4G/5G cellular, Ethernet',
  },
  {
    icon: <FiBox className="w-5 h-5" />,
    label: 'Form Factor',
    value: 'Pelican-case portable',
    detail: '15-min setup, 4-6hr battery, solar dock',
  },
]

const SOFTWARE_LAYERS = [
  {
    layer: 1,
    title: 'Capture & Reconstruction',
    license: 'Open Source',
    description: 'Gaussian splatting pipeline, temporal coherence, dynamic scene graph',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    layer: 2,
    title: 'Mood Engine',
    license: 'Open Source',
    description: 'Translates collective energy into environmental response. Node-based visual programming.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    layer: 3,
    title: 'Flow Economics',
    license: 'Hybrid',
    description: 'Solana smart contracts, token transfers, tipping, quest rewards.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    layer: 4,
    title: 'Security Enclave',
    license: 'Closed Source',
    description: 'ARM TrustZone, cryptographic operations, ZK proof generation.',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/20',
  },
]

const ZK_PROOFS = [
  {
    icon: <FiMapPin className="w-6 h-6" />,
    title: 'Presence Proofs',
    description: 'Prove you were at an event without revealing your location.',
  },
  {
    icon: <FiEye className="w-6 h-6" />,
    title: 'Age Verification',
    description: 'Prove age requirements without revealing your identity.',
  },
  {
    icon: <FiAward className="w-6 h-6" />,
    title: 'Reputation Proofs',
    description: 'Prove reputation threshold without revealing your score.',
  },
  {
    icon: <FiCreditCard className="w-6 h-6" />,
    title: 'Payment Privacy',
    description: 'Prove sufficient balance without revealing your holdings.',
  },
]

const WORKFLOW_PHASES = [
  {
    phase: 'Pre-Event Setup',
    duration: '15 min',
    icon: <FiClock className="w-6 h-6" />,
    steps: [
      'Deploy cameras & connect lighting',
      'Init mesh network & load config',
      'System self-check & calibration',
    ],
  },
  {
    phase: 'During Event',
    duration: 'Autonomous',
    icon: <FiPlay className="w-6 h-6" />,
    steps: [
      'Capture + reconstruct in real-time',
      'Mood responds to crowd energy',
      'Participants interact via phones/wearables',
    ],
  },
  {
    phase: 'Post-Event',
    duration: 'Automatic',
    icon: <FiStar className="w-6 h-6" />,
    steps: [
      'Full reconstruction refined overnight',
      'Participants receive 3D moments',
      'Treasury distributes, analytics compiled, data purged 72h',
    ],
  },
]

type LicenseStatus = 'open' | 'closed' | 'hybrid'

interface MatrixItem {
  name: string
  status: LicenseStatus
}

const DECISION_MATRIX: MatrixItem[] = [
  { name: 'Gaussian Splat Pipeline', status: 'open' },
  { name: 'Camera Calibration', status: 'open' },
  { name: 'DMX Controller', status: 'open' },
  { name: 'Sound Integration', status: 'open' },
  { name: 'Mesh Network', status: 'open' },
  { name: 'Dashboard UI', status: 'open' },
  { name: '3D Viewer', status: 'open' },
  { name: 'Token / Payment Rails', status: 'open' },
  { name: 'QR Quest Engine', status: 'hybrid' },
  { name: 'NFT Minting Service', status: 'hybrid' },
  { name: 'ZK Proof Circuits', status: 'closed' },
  { name: 'Key Management', status: 'closed' },
  { name: 'Biometric Processing', status: 'closed' },
  { name: 'Identity Verification', status: 'closed' },
  { name: 'Anti-Fraud Engine', status: 'closed' },
  { name: 'Device Attestation', status: 'closed' },
  { name: 'Firmware Signing', status: 'closed' },
]

const ROADMAP = [
  { phase: 'Phase 1', quarter: 'Q2 2026', title: 'Core Capture', description: 'Single-camera proof of concept' },
  { phase: 'Phase 2', quarter: 'Q3 2026', title: 'Multi-View & Mood', description: 'Synchronized capture, mood engine' },
  { phase: 'Phase 3', quarter: 'Q4 2026', title: 'Economic Layer', description: 'Solana contracts, quest engine, NFT minting' },
  { phase: 'Phase 4', quarter: 'Q1 2027', title: 'Security Hardening', description: 'HSM, ZK proofs, third-party audits' },
  { phase: 'Phase 5', quarter: 'Q2 2027', title: 'Community Handoff', description: 'DAO governance, community grants' },
]

type ResearchStatus = 'exploring' | 'prototyping' | 'testing' | 'published'

interface ResearchDoc {
  icon: ReactNode
  title: string
  area: string
  status: ResearchStatus
  description: string
  questions: string[]
}

const RESEARCH_DOCS: ResearchDoc[] = [
  {
    icon: <FiCamera className="w-6 h-6" />,
    title: 'Volumetric Capture for Live Events',
    area: 'Gaussian Splatting',
    status: 'exploring',
    description:
      'Investigating real-time 3D reconstruction from consumer-grade depth cameras in dynamic, low-light environments with moving subjects.',
    questions: [
      'Can we achieve <100ms latency with 4-6 synced cameras?',
      'How does crowd density affect reconstruction fidelity?',
      'What is the minimum viable capture rig for a 200-person venue?',
    ],
  },
  {
    icon: <FiActivity className="w-6 h-6" />,
    title: 'Collective Energy as Environmental Input',
    area: 'Mood Engine',
    status: 'prototyping',
    description:
      'Mapping crowd biometrics and audio energy into DMX lighting, sound, and scent outputs. Exploring feedback loops between environment and collective state.',
    questions: [
      'Which signals best represent collective mood — BPM, movement, volume?',
      'How do we prevent feedback loops from escalating too fast?',
      'Can scent diffusion meaningfully contribute to mood shifts?',
    ],
  },
  {
    icon: <FiTrendingUp className="w-6 h-6" />,
    title: 'Token Economics for Event Participation',
    area: 'Flow Layer',
    status: 'exploring',
    description:
      'Designing token flows for real-time tipping, quest rewards, and NFT moment minting. Studying how economic incentives shape event behavior.',
    questions: [
      'What token velocity is healthy for a 4-hour event?',
      'How should quest difficulty scale with crowd size?',
      'Stablecoin rails vs native token — what do participants prefer?',
    ],
  },
  {
    icon: <FiShield className="w-6 h-6" />,
    title: 'Zero-Knowledge Identity at Events',
    area: 'ZK Proofs',
    status: 'exploring',
    description:
      'Applying ZK circuits to prove presence, age, and reputation without revealing identity. Researching proof generation on edge hardware.',
    questions: [
      'Can ZK proofs generate fast enough on Jetson Orin for real-time use?',
      'What is the minimal trusted setup for event-scoped proofs?',
      'How do we handle proof revocation if a device is compromised?',
    ],
  },
  {
    icon: <FiCpu className="w-6 h-6" />,
    title: 'Edge Computing for Autonomous Events',
    area: 'Hardware',
    status: 'prototyping',
    description:
      'Building a self-contained compute unit that handles capture, processing, and blockchain transactions without cloud dependency.',
    questions: [
      'Thermal management in a sealed Pelican case — passive vs active cooling?',
      'Battery life vs GPU workload tradeoffs for 6-hour events?',
      'How do we ensure mesh network resilience when nodes move?',
    ],
  },
  {
    icon: <FiGlobe className="w-6 h-6" />,
    title: 'Progressive Decentralization Model',
    area: 'Governance',
    status: 'exploring',
    description:
      'Studying how community-owned event infrastructure transitions from core team to DAO governance without losing operational reliability.',
    questions: [
      'At what adoption threshold should governance transfer begin?',
      'How do we balance speed of decisions with community input?',
      'What treasury structure prevents capture by large token holders?',
    ],
  },
  {
    icon: <FiHeart className="w-6 h-6" />,
    title: 'Consent & Data Ethics in Capture',
    area: 'Privacy',
    status: 'exploring',
    description:
      'Defining ethical frameworks for volumetric capture in public spaces. How participants opt in, opt out, and control their 3D likeness.',
    questions: [
      'What does meaningful consent look like in a crowded venue?',
      'How do we handle bystanders who did not opt in?',
      'Should captured data have an automatic expiry?',
    ],
  },
  {
    icon: <FiDatabase className="w-6 h-6" />,
    title: '3D Memory Preservation & Access',
    area: 'Storage',
    status: 'exploring',
    description:
      'Exploring decentralized storage for volumetric event memories. How participants access, share, and own their 3D moments long-term.',
    questions: [
      'IPFS vs Arweave for volumetric data — cost and retrieval tradeoffs?',
      'What compression ratio preserves emotional fidelity of a moment?',
      'How should access control work for shared group memories?',
    ],
  },
]

const statusConfig: Record<ResearchStatus, { label: string; color: string; bg: string; border: string }> = {
  exploring: { label: 'Exploring', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  prototyping: { label: 'Prototyping', color: 'text-neon-purple', bg: 'bg-neon-purple/10', border: 'border-neon-purple/20' },
  testing: { label: 'Testing', color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/20' },
  published: { label: 'Published', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      className={`section ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={staggerContainer}
    >
      <div className="container">{children}</div>
    </motion.section>
  )
}

function SectionTitle({ sub, children }: { sub?: string; children: ReactNode }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mb-16 text-center">
      {sub && (
        <span className="inline-block text-sm font-medium tracking-widest uppercase text-neon-purple mb-3">
          {sub}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display">{children}</h2>
    </motion.div>
  )
}

const statusColors: Record<LicenseStatus, { dot: string; bg: string; text: string }> = {
  open: { dot: 'bg-emerald-400', bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
  hybrid: { dot: 'bg-amber-400', bg: 'bg-amber-400/10', text: 'text-amber-400' },
  closed: { dot: 'bg-rose-400', bg: 'bg-rose-400/10', text: 'text-rose-400' },
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function FlowBondBoxPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-neon-pink/10 blur-[160px] animate-pulse-glow" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-neon-purple/10 blur-[140px] animate-pulse-glow [animation-delay:1s]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-neon-blue/8 blur-[120px] animate-pulse-glow [animation-delay:2s]" />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Top nav */}
      {/* ----------------------------------------------------------------- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/70 backdrop-blur-xl border-b border-white/5">
        <div className="container flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <span className="text-xs font-mono text-text-muted tracking-wider uppercase">FlowBond Box</span>
          <span className="text-[10px] font-mono text-neon-purple/60 border border-neon-purple/20 px-2 py-0.5 rounded-full">
            v0.1 DRAFT
          </span>
        </div>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* RESEARCH MODE BANNER */}
      {/* ----------------------------------------------------------------- */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-amber-500/10 backdrop-blur-md border-b border-amber-500/20">
        <div className="container flex items-center justify-center gap-3 py-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <span className="text-xs sm:text-sm font-mono font-medium text-amber-300 tracking-wide uppercase">
            This device is in research mode — everything here is under active discovery
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* HERO */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative min-h-screen flex items-center justify-center pt-28 overflow-hidden">
        <div className="container relative z-10 text-center py-20 lg:py-32">
          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-8 text-xs font-mono text-text-muted"
          >
            <span>FlowBond Ecosystem</span>
            <span className="w-1 h-1 rounded-full bg-neon-purple" />
            <span>Harmonik</span>
            <span className="w-1 h-1 rounded-full bg-neon-purple" />
            <span>February 2026</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold font-display gradient-text leading-none mb-6"
          >
            FlowBond Box
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-lg sm:text-xl lg:text-2xl text-text-secondary font-display max-w-2xl mx-auto mb-4"
          >
            All-in-One Event Capture &amp; Mood Creation System
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-base sm:text-lg text-text-muted italic max-w-xl mx-auto mb-16"
          >
            &ldquo;Turn off the lights. Turn on the flow.&rdquo;
          </motion.p>

          {/* 3D Box visual */}
          <motion.div
            initial={{ opacity: 0, rotateX: 15, rotateY: -15 }}
            animate={{ opacity: 1, rotateX: 0, rotateY: 0 }}
            transition={{ delay: 1.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96 mb-16"
            style={{ perspective: '1000px' }}
          >
            {/* Rotating cube container */}
            <motion.div
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: [0, 8, -8, 0], rotateX: [0, -4, 4, 0] }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-2xl border border-neon-purple/30 bg-bg-card/60 backdrop-blur-sm"
                style={{ transform: 'translateZ(48px)' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <FiBox className="w-12 h-12 sm:w-16 sm:h-16 text-neon-purple mx-auto mb-3" />
                    <span className="text-xs font-mono text-neon-pink tracking-widest uppercase">FlowBond</span>
                  </div>
                </div>
                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-neon-pink/50 rounded-tl" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-neon-pink/50 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-neon-blue/50 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-neon-blue/50 rounded-br" />
              </div>
              {/* Side glow */}
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-pink/5 to-neon-purple/5"
                style={{ transform: 'rotateY(90deg) translateZ(48px)' }}
              />
              {/* Top glow */}
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-neon-blue/5 to-transparent"
                style={{ transform: 'rotateX(90deg) translateZ(48px)' }}
              />
            </motion.div>
            {/* Floor glow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-neon-purple/20 blur-2xl rounded-full" />
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.6 }}
            className="flex flex-col items-center gap-2 text-text-muted"
          >
            <span className="text-xs font-mono tracking-wider">Scroll to explore</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}>
              <FiChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* CAPABILITIES */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <SectionTitle sub="What It Does">
          Three Engines. <span className="gradient-text">One System.</span>
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.title}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card group hover:shadow-glow-purple"
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5 transition-colors duration-300 ${
                  cap.color === 'neon-pink'
                    ? 'bg-neon-pink/10 text-neon-pink group-hover:bg-neon-pink/20'
                    : cap.color === 'neon-purple'
                      ? 'bg-neon-purple/10 text-neon-purple group-hover:bg-neon-purple/20'
                      : 'bg-neon-blue/10 text-neon-blue group-hover:bg-neon-blue/20'
                }`}
              >
                {cap.icon}
              </div>
              <h3 className="text-xl font-bold font-display mb-3">{cap.title}</h3>
              <p className="text-text-secondary leading-relaxed">{cap.description}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* RESEARCH DOCUMENTS */}
      {/* ----------------------------------------------------------------- */}
      <Section className="bg-bg-secondary/50">
        <SectionTitle sub="Research">
          Open Questions. <span className="gradient-text">Active Discovery.</span>
        </SectionTitle>
        <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-center text-text-secondary max-w-2xl mx-auto mb-12 -mt-8">
          Nothing here is final. These are the threads we are pulling -- the questions driving every prototype, test, and conversation.
        </motion.p>

        {/* Status legend */}
        <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="flex flex-wrap justify-center gap-4 mb-10">
          {(Object.entries(statusConfig) as [ResearchStatus, typeof statusConfig[ResearchStatus]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${cfg.bg} ring-1 ${cfg.border}`} />
              <span className={cfg.color}>{cfg.label}</span>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {RESEARCH_DOCS.map((doc, i) => {
            const s = statusConfig[doc.status]
            return (
              <motion.div
                key={doc.title}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`card border ${s.border} group`}
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${s.bg} ${s.color} uppercase tracking-wider`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                        {doc.area}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg leading-tight">{doc.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {doc.description}
                </p>

                {/* Open questions */}
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Open Questions</span>
                  {doc.questions.map((q) => (
                    <div key={q} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-neon-purple mt-1 flex-shrink-0">?</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* PHILOSOPHY */}
      {/* ----------------------------------------------------------------- */}
      <Section className="bg-bg-secondary/50">
        <SectionTitle sub="Philosophy">
          Open by Default. <span className="gradient-text">Closed for Protection.</span>
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Open side */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="card border-emerald-400/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                <FiUnlock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold font-display text-emerald-400">Open Source</h3>
            </div>
            <p className="text-text-secondary leading-relaxed mb-4">
              Everything that empowers the community stays open. Capture pipelines, mood engine, lighting control,
              dashboard UI, 3D viewer, and payment rails -- all open for audit, fork, and contribution.
            </p>
            <div className="flex flex-wrap gap-2">
              {['MIT', 'Apache-2.0', 'Community Auditable'].map((tag) => (
                <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
          {/* Closed side */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6, delay: 0.15 }} className="card border-rose-400/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-rose-400/10 flex items-center justify-center">
                <FiShield className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold font-display text-rose-400">Closed for Protection</h3>
            </div>
            <p className="text-text-secondary leading-relaxed mb-4">
              Everything that protects the community can be closed. ZK proofs, key management, biometrics,
              anti-fraud -- not about monetization gates, but about security boundaries.
            </p>
            <div className="flex flex-wrap gap-2">
              {['ZK Circuits', 'HSM Firmware', 'Security Enclave'].map((tag) => (
                <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-full bg-rose-400/10 text-rose-400">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* HARDWARE SPECS */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <SectionTitle sub="Hardware">
          Built to <span className="gradient-text">Perform.</span>
        </SectionTitle>
        <div className="max-w-3xl mx-auto space-y-4">
          {HARDWARE_SPECS.map((spec, i) => (
            <motion.div
              key={spec.label}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card flex items-start gap-4 sm:gap-6"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center text-neon-purple">
                {spec.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-neon-pink">{spec.label}</span>
                  <span className="text-text-primary font-display font-semibold">{spec.value}</span>
                </div>
                <p className="text-sm text-text-muted">{spec.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* SOFTWARE ARCHITECTURE */}
      {/* ----------------------------------------------------------------- */}
      <Section className="bg-bg-secondary/50">
        <SectionTitle sub="Architecture">
          Four Layers. <span className="gradient-text">One Stack.</span>
        </SectionTitle>
        <div className="max-w-3xl mx-auto space-y-0">
          {SOFTWARE_LAYERS.map((layer, i) => (
            <motion.div
              key={layer.layer}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative p-6 border ${layer.border} ${layer.bg} ${
                i === 0
                  ? 'rounded-t-xl'
                  : i === SOFTWARE_LAYERS.length - 1
                    ? 'rounded-b-xl'
                    : ''
              } ${i > 0 ? '-mt-px' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <span className="text-xs font-mono text-text-muted">L{layer.layer}</span>
                <h3 className="font-display font-bold text-lg">{layer.title}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${layer.bg} ${layer.color}`}>
                  {layer.license}
                </span>
              </div>
              <p className="text-sm text-text-secondary pl-0 sm:pl-10">{layer.description}</p>
              {/* Connector line */}
              {i < SOFTWARE_LAYERS.length - 1 && (
                <div className="absolute left-8 -bottom-px w-px h-2 bg-gradient-to-b from-white/10 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* ZERO-KNOWLEDGE PRIVACY */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <SectionTitle sub="Privacy">
          Zero-Knowledge. <span className="gradient-text">Full Proof.</span>
        </SectionTitle>
        <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-center text-text-secondary max-w-2xl mx-auto mb-12 -mt-8">
          Privacy is not a feature. It is foundational. Every interaction is wrapped in cryptographic guarantees.
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ZK_PROOFS.map((proof, i) => (
            <motion.div
              key={proof.title}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card text-center group"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neon-blue/10 text-neon-blue mb-4 group-hover:bg-neon-blue/20 transition-colors">
                {proof.icon}
              </div>
              <h3 className="font-display font-bold mb-2">{proof.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{proof.description}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* EVENT WORKFLOW */}
      {/* ----------------------------------------------------------------- */}
      <Section className="bg-bg-secondary/50">
        <SectionTitle sub="Workflow">
          Three Phases. <span className="gradient-text">Zero Friction.</span>
        </SectionTitle>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {WORKFLOW_PHASES.map((phase, i) => (
            <motion.div
              key={phase.phase}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="card relative"
            >
              {/* Phase number */}
              <div className="absolute -top-3 left-6 px-3 py-0.5 bg-bg-primary rounded-full border border-neon-purple/30 text-xs font-mono text-neon-purple">
                {i + 1}
              </div>
              <div className="flex items-center gap-3 mb-4 pt-2">
                <div className="w-10 h-10 rounded-lg bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                  {phase.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold">{phase.phase}</h3>
                  <span className="text-xs text-text-muted font-mono">{phase.duration}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {phase.steps.map((step) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-text-secondary">
                    <FiCheckCircle className="w-4 h-4 text-neon-purple mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              {/* Connector arrow on desktop */}
              {i < WORKFLOW_PHASES.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 text-neon-purple/30">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1 8h14M10 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* OPEN/CLOSED DECISION MATRIX */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <SectionTitle sub="Transparency">
          Open / Closed <span className="gradient-text">Decision Matrix</span>
        </SectionTitle>
        <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {(['open', 'hybrid', 'closed'] as const).map((status) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status].dot}`} />
                <span className={`${statusColors[status].text} capitalize font-mono text-xs`}>
                  {status === 'open' ? 'Open Source' : status === 'hybrid' ? 'Hybrid' : 'Closed Source'}
                </span>
              </div>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DECISION_MATRIX.map((item, i) => {
              const s = statusColors[item.status]
              return (
                <motion.div
                  key={item.name}
                  variants={fadeIn}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    item.status === 'open'
                      ? 'border-emerald-400/15 bg-emerald-400/5'
                      : item.status === 'hybrid'
                        ? 'border-amber-400/15 bg-amber-400/5'
                        : 'border-rose-400/15 bg-rose-400/5'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className="text-sm text-text-primary">{item.name}</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* ROADMAP */}
      {/* ----------------------------------------------------------------- */}
      <Section className="bg-bg-secondary/50">
        <SectionTitle sub="Roadmap">
          The Path <span className="gradient-text">Forward</span>
        </SectionTitle>
        <div className="max-w-3xl mx-auto relative">
          {/* Timeline line */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon-pink/40 via-neon-purple/40 to-neon-blue/40" />
          <div className="space-y-8">
            {ROADMAP.map((item, i) => (
              <motion.div
                key={item.phase}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pl-12 sm:pl-16"
              >
                {/* Timeline dot */}
                <div className="absolute left-[10px] sm:left-[18px] top-1 w-3 h-3 rounded-full bg-neon-purple border-2 border-bg-primary" />
                <div className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                    <span className="text-xs font-mono text-neon-pink">{item.quarter}</span>
                    <h3 className="font-display font-bold text-lg">{item.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* GOVERNANCE */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <SectionTitle sub="Governance">
          Community <span className="gradient-text">Owned</span>
        </SectionTitle>
        <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neon-purple/10 text-neon-purple mb-6">
            <FiUsers className="w-8 h-8" />
          </div>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              FlowBond Box will operate under <strong className="text-text-primary">progressive decentralization</strong>.
              Development begins under the core team, with governance transitioning to a DAO as the platform matures.
            </p>
            <p>
              Community members will have <strong className="text-text-primary">audit rights</strong> over all open-source
              components, voting power over protocol parameters, and the ability to propose and fund new features through
              community grants.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {['DAO Governance', 'Community Grants', 'Audit Rights', 'Progressive Decentralization'].map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-3 py-1.5 rounded-full border border-neon-purple/20 text-neon-purple bg-neon-purple/5"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* FOOTER CTA */}
      {/* ----------------------------------------------------------------- */}
      <section className="section bg-bg-secondary/50 border-t border-white/5">
        <div className="container text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4"
            >
              We don&apos;t chase. <span className="gradient-text">We are.</span>
            </motion.p>
            <motion.p variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="text-text-muted mb-10">
              FlowBond Box -- Community-owned event infrastructure.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <Link href="/" className="btn btn-primary gap-2">
                <FiArrowLeft className="w-4 h-4" />
                Back to DANZ
              </Link>
            </motion.div>
          </motion.div>
          {/* Bottom metadata */}
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted font-mono">
            <span>FlowBond Ecosystem &middot; Harmonik</span>
            <span>v0.1 DRAFT &middot; February 2026</span>
          </div>
        </div>
      </section>
    </main>
  )
}
