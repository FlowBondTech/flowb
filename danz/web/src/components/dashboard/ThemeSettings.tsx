'use client'

import { type Theme, getDarkThemes, getLightThemes } from '@/src/constants/themes'
import { useTheme } from '@/src/contexts/ThemeContext'
import { useState } from 'react'
import { FiCheck, FiDroplet, FiMonitor, FiMoon, FiSave, FiSun, FiTrash2 } from 'react-icons/fi'

function ThemeCard({
  theme,
  isActive,
  onSelect,
  onDelete,
}: {
  theme: Theme
  isActive: boolean
  onSelect: () => void
  onDelete?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
        isActive
          ? 'border-neon-purple bg-bg-hover shadow-glow-purple'
          : 'border-white/10 bg-bg-card hover:border-neon-purple/50 hover:bg-bg-hover'
      }`}
    >
      {isActive && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-neon-purple rounded-full flex items-center justify-center">
          <FiCheck className="w-4 h-4 text-text-primary" />
        </div>
      )}

      {/* Color preview */}
      <div className="flex gap-1.5 mb-3">
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors.primary }} />
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors.neonPink }} />
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors.neonPurple }} />
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.colors.bgPrimary }} />
      </div>

      <div className="flex items-center gap-2 mb-1">
        {theme.isDark ? (
          <FiMoon className="w-4 h-4 text-text-muted" />
        ) : (
          <FiSun className="w-4 h-4 text-text-muted" />
        )}
        <span className="font-semibold text-text-primary">{theme.name}</span>
      </div>
      <p className="text-text-muted text-sm">{theme.description}</p>

      {onDelete && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute bottom-3 right-3 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      )}
    </button>
  )
}

function ColorPicker({
  label,
  colorKey,
  value,
  onChange,
}: {
  label: string
  colorKey: string
  value: string
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer overflow-hidden relative"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={e => onChange(colorKey, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(colorKey, e.target.value)}
          className="w-20 px-2 py-1 bg-bg-primary border border-white/10 rounded-lg text-text-primary text-sm font-mono uppercase"
        />
      </div>
    </div>
  )
}

export default function ThemeSettings() {
  const {
    theme,
    themeId,
    customColors,
    mode,
    useSystemTheme,
    setTheme,
    setCustomColor,
    resetCustomColors,
    saveCustomTheme,
    deleteCustomTheme,
    getCustomThemes,
    toggleMode,
    setUseSystemTheme,
  } = useTheme()

  const [showCustomize, setShowCustomize] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Show themes matching current mode
  const presetThemes = mode === 'dark' ? getDarkThemes() : getLightThemes()
  const customThemes = getCustomThemes().filter(t => t.isDark === (mode === 'dark'))
  const hasCustomColors = Object.keys(customColors).length > 0

  const currentColors = { ...theme.colors, ...customColors }

  const colorFields = [
    { key: 'primary', label: 'Primary' },
    { key: 'primaryAlt', label: 'Primary Alt' },
    { key: 'neonPink', label: 'Neon Pink' },
    { key: 'neonPurple', label: 'Neon Purple' },
    { key: 'neonBlue', label: 'Neon Blue' },
    { key: 'bgPrimary', label: 'Background' },
    { key: 'bgSecondary', label: 'Background 2' },
    { key: 'bgCard', label: 'Card' },
    { key: 'bgHover', label: 'Hover' },
    { key: 'textPrimary', label: 'Text' },
    { key: 'textSecondary', label: 'Text Secondary' },
    { key: 'textMuted', label: 'Text Muted' },
  ]

  const handleSaveTheme = () => {
    if (saveName.trim()) {
      saveCustomTheme(saveName.trim())
      setSaveName('')
      setShowSaveModal(false)
      setShowCustomize(false)
    }
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6">
      <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
        <FiDroplet className="text-neon-purple" />
        Theme & Appearance
      </h2>

      {/* Mode Toggle */}
      <div className="mb-6">
        <h3 className="text-text-secondary text-sm font-medium mb-3">Appearance Mode</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setUseSystemTheme(false)
              if (mode !== 'dark') toggleMode()
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
              !useSystemTheme && mode === 'dark'
                ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                : 'border-white/10 text-text-secondary hover:border-white/20'
            }`}
          >
            <FiMoon className="w-5 h-5" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => {
              setUseSystemTheme(false)
              if (mode !== 'light') toggleMode()
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
              !useSystemTheme && mode === 'light'
                ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                : 'border-white/10 text-text-secondary hover:border-white/20'
            }`}
          >
            <FiSun className="w-5 h-5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setUseSystemTheme(!useSystemTheme)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
              useSystemTheme
                ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                : 'border-white/10 text-text-secondary hover:border-white/20'
            }`}
          >
            <FiMonitor className="w-5 h-5" />
            System
          </button>
        </div>
        {useSystemTheme && (
          <p className="text-text-muted text-xs mt-2">
            Automatically matches your device's appearance settings
          </p>
        )}
      </div>

      {/* Preset Themes */}
      <div className="mb-6">
        <h3 className="text-text-secondary text-sm font-medium mb-3">
          {mode === 'dark' ? 'Dark' : 'Light'} Themes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presetThemes.map(t => (
            <ThemeCard
              key={t.id}
              theme={t}
              isActive={themeId === t.id && !hasCustomColors}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Custom Themes */}
      {customThemes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-text-secondary text-sm font-medium mb-3">Your Custom Themes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customThemes.map(t => (
              <ThemeCard
                key={t.id}
                theme={t}
                isActive={themeId === t.id}
                onSelect={() => setTheme(t.id)}
                onDelete={() => deleteCustomTheme(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Customize Colors Toggle */}
      <button
        type="button"
        onClick={() => setShowCustomize(!showCustomize)}
        className="w-full py-3 px-4 rounded-xl border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors flex items-center justify-center gap-2"
      >
        <FiDroplet className="w-5 h-5" />
        {showCustomize ? 'Hide Color Customization' : 'Customize Colors'}
      </button>

      {/* Color Customization Panel */}
      {showCustomize && (
        <div className="mt-6 p-4 bg-bg-card rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-primary font-medium">Customize Colors</h3>
            {hasCustomColors && (
              <button
                type="button"
                onClick={resetCustomColors}
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Reset to Default
              </button>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {colorFields.map(({ key, label }) => (
              <ColorPicker
                key={key}
                label={label}
                colorKey={key}
                value={currentColors[key as keyof typeof currentColors]}
                onChange={setCustomColor}
              />
            ))}
          </div>

          {hasCustomColors && (
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-neon text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <FiSave className="w-5 h-5" />
              Save as Custom Theme
            </button>
          )}
        </div>
      )}

      {/* Save Theme Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-xl border border-neon-purple/20 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-text-primary mb-4">Save Custom Theme</h3>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Theme name..."
              className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-primary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTheme}
                disabled={!saveName.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-neon text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
