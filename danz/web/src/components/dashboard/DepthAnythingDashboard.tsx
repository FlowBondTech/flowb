'use client'

import {
  type DepthAnythingReconstructOptions,
  depthAnythingApi,
} from '@/src/services/depth-anything/api'
import { useEffect, useMemo, useState } from 'react'
import { FiImage, FiTrash2, FiUpload, FiVideo, FiZap } from 'react-icons/fi'

export default function DepthAnythingDashboard() {
  const [images, setImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [samplingFps, setSamplingFps] = useState<number>(10)

  const [targetDir, setTargetDir] = useState<string | null>(null)
  const [log, setLog] = useState<string>('')

  const [isUploading, setIsUploading] = useState(false)
  const [isReconstructing, setIsReconstructing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasReconstructed, setHasReconstructed] = useState(false)

  const [rgbUrl, setRgbUrl] = useState<string | null>(null)
  const [depthUrl, setDepthUrl] = useState<string | null>(null)
  const [model3dUrl, setModel3dUrl] = useState<string | null>(null)

  const [options, setOptions] = useState<DepthAnythingReconstructOptions>({
    show_cam: true,
    filter_black_bg: false,
    filter_white_bg: false,
    process_res_method: 'low_res',
    save_percentage: 10,
    num_max_points: 1000,
    infer_gs: false,
    gs_trj_mode: 'smooth',
    gs_video_quality: 'low',
  })

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const fromQuery = params.get('targetDir')
      const fromStorage = window.localStorage.getItem('depthAnything.targetDir')

      const value = fromQuery || fromStorage
      if (value && !targetDir) {
        setTargetDir(value)
      }
    } catch {}
  }, [targetDir])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)

      if (targetDir) {
        url.searchParams.set('targetDir', targetDir)
        window.localStorage.setItem('depthAnything.targetDir', targetDir)
      } else {
        url.searchParams.delete('targetDir')
        window.localStorage.removeItem('depthAnything.targetDir')
      }

      window.history.replaceState({}, '', url.toString())
    } catch {}
  }, [targetDir])

  const imagePreviews = useMemo(() => {
    return images.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))
  }, [images])

  const videoPreview = useMemo(() => {
    if (!video) return null
    return URL.createObjectURL(video)
  }, [video])

  const handleSelectImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setImages(files)
    setError(null)
    setTargetDir(null)
    setLog('')
    setRgbUrl(null)
    setDepthUrl(null)
    setModel3dUrl(null)
    setHasReconstructed(false)
  }

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setVideo(file)
    setError(null)
    setTargetDir(null)
    setLog('')
    setRgbUrl(null)
    setDepthUrl(null)
    setModel3dUrl(null)
  }

  const handlePrepare = async () => {
    setError(null)

    if (images.length === 0 && !video) {
      setError('Please select at least one image or a video.')
      return
    }

    try {
      setIsUploading(true)
      const result = await depthAnythingApi.prepare({
        images,
        video,
        samplingFps,
      })

      setTargetDir(result.targetDir)
      setLog(result.log || '')
      setHasReconstructed(false)

      if (result.model3d?.url) setModel3dUrl(result.model3d.url)
    } catch (err: any) {
      setError(err?.message || 'Failed to upload inputs.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReconstruct = async () => {
    setError(null)

    if (!targetDir) {
      setError('Please upload inputs first.')
      return
    }

    try {
      setIsReconstructing(true)
      const result = await depthAnythingApi.reconstruct({
        targetDir,
        options,
      })

      setLog(result.log || '')
      setHasReconstructed(true)

      if (result.model3d?.url) setModel3dUrl(result.model3d.url)
      if (result.rgbImage?.url) setRgbUrl(result.rgbImage.url)
      if (result.depthImage?.url) setDepthUrl(result.depthImage.url)
    } catch (err: any) {
      setError(err?.message || 'Reconstruction failed.')
    } finally {
      setIsReconstructing(false)
    }
  }

  const handleClear = async () => {
    setError(null)

    try {
      await depthAnythingApi.clear()
    } catch (err: any) {
      setError(err?.message || 'Failed to clear remote state.')
    }

    setImages([])
    setVideo(null)
    setTargetDir(null)
    setLog('')
    setRgbUrl(null)
    setDepthUrl(null)
    setModel3dUrl(null)
    setHasReconstructed(false)
  }

  const step = isUploading
    ? 'uploading'
    : isReconstructing
      ? 'reconstructing'
      : targetDir
        ? hasReconstructed
          ? 'done'
          : 'ready'
        : 'idle'

  const stepOrder = ['uploading', 'ready', 'reconstructing', 'done'] as const
  const activeIndex = stepOrder.indexOf(step as any)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-bg-secondary border border-white/5 rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
              Depth-Anything Model
            </h1>
            <p className="text-text-secondary mt-2">
              Upload images or a video, then run reconstruction to generate a point cloud + depth.
            </p>
          </div>
        </div>

        <div className="mb-6 bg-bg-primary/30 border border-white/5 rounded-xl p-4">
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { key: 'uploading', label: 'Uploading' },
                { key: 'ready', label: 'Ready' },
                { key: 'reconstructing', label: 'Reconstructing' },
                { key: 'done', label: 'Done' },
              ] as const
            ).map((s, idx) => {
              const isActive = activeIndex !== -1 && idx === activeIndex
              const isCompleted = activeIndex !== -1 && idx < activeIndex
              const base =
                'px-3 py-2 rounded-lg text-center text-xs font-medium border transition-colors'
              const styles = isActive
                ? 'bg-neon-purple/15 text-neon-purple border-neon-purple/30'
                : isCompleted
                  ? 'bg-white/5 text-text-primary border-white/10'
                  : 'bg-transparent text-text-muted border-white/10'

              return (
                <div key={s.key} className={`${base} ${styles}`}>
                  {s.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-bg-primary/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-text-primary font-semibold mb-4">
                <FiUpload className="text-neon-purple" />
                Inputs
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Upload Images
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/10 hover:border-neon-purple/50 bg-bg-primary/40 hover:bg-bg-primary/60 transition-colors cursor-pointer">
                    <FiImage className="text-neon-purple" />
                    <span className="text-sm text-text-secondary">Choose images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleSelectImages}
                      disabled={isUploading || isReconstructing}
                    />
                  </label>
                  {imagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {imagePreviews.slice(0, 6).map(p => (
                        <img
                          key={p.url}
                          src={p.url}
                          alt={p.name}
                          className="w-full h-20 object-cover rounded-lg border border-white/10"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Upload Video (optional)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/10 hover:border-neon-purple/50 bg-bg-primary/40 hover:bg-bg-primary/60 transition-colors cursor-pointer">
                    <FiVideo className="text-neon-pink" />
                    <span className="text-sm text-text-secondary">Choose a video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleSelectVideo}
                      disabled={isUploading || isReconstructing}
                    />
                  </label>
                  {videoPreview && (
                    <div className="mt-3">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full rounded-lg border border-white/10"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Sampling FPS
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    max={60}
                    step={0.1}
                    value={samplingFps}
                    onChange={e => setSamplingFps(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary/40 border border-white/10 text-text-primary"
                    disabled={isUploading || isReconstructing}
                  />
                  <p className="text-xs text-text-muted mt-2">
                    Higher FPS means more frames sampled.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={handlePrepare}
                    disabled={isUploading || isReconstructing}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleClear}
                    disabled={isUploading || isReconstructing}
                  >
                    <FiTrash2 />
                  </button>
                </div>

                {targetDir && (
                  <div className="text-xs text-text-muted break-all">
                    <span className="text-text-secondary">Target Dir:</span> {targetDir}
                  </div>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </div>

            <div className="bg-bg-primary/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-text-primary font-semibold mb-4">
                <FiZap className="text-neon-cyan" />
                Reconstruction Options
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!options.show_cam}
                    onChange={e => setOptions(o => ({ ...o, show_cam: e.target.checked }))}
                    disabled={isUploading || isReconstructing}
                  />
                  Show Camera
                </label>

                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!options.filter_black_bg}
                    onChange={e => setOptions(o => ({ ...o, filter_black_bg: e.target.checked }))}
                    disabled={isUploading || isReconstructing}
                  />
                  Filter Black Background
                </label>

                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!options.filter_white_bg}
                    onChange={e => setOptions(o => ({ ...o, filter_white_bg: e.target.checked }))}
                    disabled={isUploading || isReconstructing}
                  />
                  Filter White Background
                </label>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Image Processing Method
                  </label>
                  <select
                    value={options.process_res_method ?? 'low_res'}
                    onChange={e =>
                      setOptions(o => ({
                        ...o,
                        process_res_method: e.target.value as 'high_res' | 'low_res',
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary/40 border border-white/10 text-text-primary"
                    disabled={isUploading || isReconstructing}
                  >
                    <option value="low_res">low_res</option>
                    <option value="high_res">high_res</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={handleReconstruct}
                  disabled={isUploading || isReconstructing || !targetDir}
                >
                  {isReconstructing ? 'Reconstructing...' : 'Reconstruct'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-bg-primary/30 border border-white/5 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-3">Outputs</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-white/10 rounded-xl overflow-hidden bg-bg-secondary/30">
                  <div className="px-4 py-3 border-b border-white/10 text-sm text-text-secondary">
                    RGB
                  </div>
                  {rgbUrl ? (
                    <img src={rgbUrl} alt="RGB" className="w-full object-contain" />
                  ) : (
                    <div className="p-8 text-sm text-text-muted">No RGB output yet.</div>
                  )}
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden bg-bg-secondary/30">
                  <div className="px-4 py-3 border-b border-white/10 text-sm text-text-secondary">
                    Depth
                  </div>
                  {depthUrl ? (
                    <img src={depthUrl} alt="Depth" className="w-full object-contain" />
                  ) : (
                    <div className="p-8 text-sm text-text-muted">No depth output yet.</div>
                  )}
                </div>
              </div>

              {model3dUrl && (
                <div className="mt-4">
                  <a
                    href={model3dUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neon-purple hover:underline"
                  >
                    Download / Open 3D Model
                  </a>
                </div>
              )}
            </div>

            <div className="bg-bg-primary/30 border border-white/5 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-3">Logs</h2>
              <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words bg-bg-secondary/40 border border-white/10 rounded-xl p-4 min-h-[140px]">
                {log || 'No logs yet.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
