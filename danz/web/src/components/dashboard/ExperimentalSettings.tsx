'use client'

import { useExperimental } from '@/src/contexts/ExperimentalContext'
import { FiAlertTriangle, FiBox, FiZap } from 'react-icons/fi'

export default function ExperimentalSettings() {
  const { experimentalEnabled, setExperimentalEnabled } = useExperimental()

  return (
    <div className="bg-bg-secondary rounded-xl border border-yellow-500/20 p-6">
      <h2 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-3">
        <FiZap className="text-yellow-500" />
        Experimental Features
      </h2>
      <p className="text-text-muted text-sm mb-6">
        Enable access to features that are still in development. These may be unstable or change at
        any time.
      </p>

      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-bg-card rounded-xl border border-white/5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
            <FiBox className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-text-primary font-medium">Enable Experimental Features</p>
            <p className="text-text-muted text-sm">Show experimental section in the dashboard</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExperimentalEnabled(!experimentalEnabled)}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            experimentalEnabled ? 'bg-yellow-500' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              experimentalEnabled ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      {/* Warning */}
      {experimentalEnabled && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <FiAlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium text-sm">Experimental Mode Active</p>
            <p className="text-text-muted text-sm mt-1">
              You now have access to experimental features in the sidebar. These features are under
              active development and may not work as expected.
            </p>
          </div>
        </div>
      )}

      {/* Available Features */}
      {experimentalEnabled && (
        <div className="mt-6">
          <h3 className="text-text-secondary text-sm font-medium mb-3">Available Experiments</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-bg-card rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔮</span>
                <span className="text-text-primary text-sm">Depth Anything (AI Depth Maps)</span>
              </div>
              <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-card rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-lg">🧩</span>
                <span className="text-text-primary text-sm">Mini-Apps Ideas Lab</span>
              </div>
              <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
