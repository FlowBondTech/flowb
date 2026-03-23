'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { FiCheck, FiCopy, FiDownload, FiMaximize2, FiX } from 'react-icons/fi'

interface EventCheckinCodeProps {
  checkinCode: string
  eventTitle: string
}

export default function EventCheckinCode({ checkinCode, eventTitle }: EventCheckinCodeProps) {
  const [copied, setCopied] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(checkinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const svg = document.getElementById('event-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      const a = document.createElement('a')
      a.download = `${eventTitle.replace(/\s+/g, '-')}-checkin-qr.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // QR code content - can be scanned to open check-in page
  const qrContent = `danz://checkin/${checkinCode}`

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Event Check-in Code</h3>

        <div className="flex flex-col items-center gap-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              id="event-qr-code"
              value={qrContent}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          {/* Code Display */}
          <div className="flex items-center gap-3">
            <div className="text-3xl font-mono font-bold tracking-wider text-neon-purple">
              {checkinCode}
            </div>
            <button
              onClick={copyCode}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <FiCheck className="text-green-500" size={20} />
              ) : (
                <FiCopy className="text-text-secondary" size={20} />
              )}
            </button>
          </div>

          <p className="text-text-secondary text-sm text-center">
            Attendees can scan the QR code or enter this code to check in
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowFullscreen(true)}
              className="flex-1 py-2.5 px-4 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 rounded-xl text-neon-purple font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiMaximize2 size={16} />
              Display
            </button>
            <button
              onClick={downloadQR}
              className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiDownload size={16} />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen QR Display */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <FiX className="text-white" size={24} />
          </button>

          <h2 className="text-white text-2xl font-bold mb-8">{eventTitle}</h2>

          <div className="bg-white p-8 rounded-3xl">
            <QRCodeSVG
              value={qrContent}
              size={Math.min(window.innerWidth * 0.7, 400)}
              level="H"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          <div className="mt-8 text-white text-5xl font-mono font-bold tracking-widest">
            {checkinCode}
          </div>

          <p className="mt-4 text-white/60 text-lg">Scan QR code or enter code to check in</p>
        </div>
      )}
    </>
  )
}
