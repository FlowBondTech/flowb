'use client'

import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi'

export interface CategoryOption {
  slug: string
  name: string
  icon?: string
  description?: string
}

interface CategoryMultiSelectProps {
  options: CategoryOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  maxSelections?: number
  disabled?: boolean
  error?: string
  label?: string
  showIcons?: boolean
  searchable?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const SPONSOR_CATEGORIES: CategoryOption[] = [
  {
    slug: 'apparel',
    name: 'Dance Apparel & Footwear',
    icon: '👟',
    description: 'Dance shoes, athletic wear, costumes',
  },
  {
    slug: 'music',
    name: 'Music & Audio',
    icon: '🎵',
    description: 'Streaming, DJ equipment, labels',
  },
  {
    slug: 'wellness',
    name: 'Health & Wellness',
    icon: '💪',
    description: 'Sports drinks, supplements, fitness',
  },
  {
    slug: 'tech',
    name: 'Technology & Wearables',
    icon: '⌚',
    description: 'Fitness trackers, AR/VR, apps',
  },
  {
    slug: 'venues',
    name: 'Entertainment Venues',
    icon: '🏟️',
    description: 'Studios, venues, ticketing',
  },
  {
    slug: 'local',
    name: 'Local Business',
    icon: '🏪',
    description: 'Restaurants, cafes near events',
  },
  {
    slug: 'media',
    name: 'Media & Influencer',
    icon: '📱',
    description: 'Content creators, media outlets',
  },
  {
    slug: 'education',
    name: 'Education & Training',
    icon: '📚',
    description: 'Dance schools, online courses',
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle & Fashion',
    icon: '👗',
    description: 'Fashion, beauty, accessories',
  },
  {
    slug: 'corporate',
    name: 'Corporate',
    icon: '🏢',
    description: 'Team building, enterprise events',
  },
]

export default function CategoryMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select categories...',
  maxSelections,
  disabled = false,
  error,
  label,
  showIcons = true,
  searchable = true,
  size = 'md',
}: CategoryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = searchQuery
    ? options.filter(
        opt =>
          opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options

  const handleToggle = (slug: string) => {
    if (selected.includes(slug)) {
      onChange(selected.filter(s => s !== slug))
    } else if (!maxSelections || selected.length < maxSelections) {
      onChange([...selected, slug])
    }
  }

  const handleRemove = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(s => s !== slug))
  }

  const handleSelectAll = () => {
    if (maxSelections) {
      onChange(options.slice(0, maxSelections).map(o => o.slug))
    } else {
      onChange(options.map(o => o.slug))
    }
  }

  const handleClearAll = () => {
    onChange([])
  }

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2.5 px-4 text-base',
    lg: 'py-3 px-5 text-lg',
  }

  const selectedOptions = options.filter(o => selected.includes(o.slug))

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
          {maxSelections && (
            <span className="text-text-muted font-normal ml-1">
              ({selected.length}/{maxSelections})
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-white/5 border rounded-xl transition-colors ${
          isOpen ? 'border-neon-purple/50' : 'border-white/10 hover:border-white/20'
        } ${error ? 'border-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${sizeClasses[size]}`}
      >
        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[24px]">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <span
                key={opt.slug}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded-full text-sm"
              >
                {showIcons && opt.icon && <span className="text-xs">{opt.icon}</span>}
                <span className="truncate max-w-[100px]">{opt.name}</span>
                <button
                  type="button"
                  onClick={e => handleRemove(opt.slug, e)}
                  className="hover:bg-white/10 rounded-full p-0.5"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <FiChevronDown
          className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          {searchable && (
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:border-neon-purple/50 focus:outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-neon-purple hover:text-neon-purple/80 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selected.includes(option.slug)
                const isDisabled =
                  !isSelected && maxSelections !== undefined && selected.length >= maxSelections

                return (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => !isDisabled && handleToggle(option.slug)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-neon-purple/10'
                        : isDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-neon-purple border-neon-purple' : 'border-white/20'
                      }`}
                    >
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>

                    {/* Icon */}
                    {showIcons && option.icon && (
                      <span className="text-xl flex-shrink-0">{option.icon}</span>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{option.name}</p>
                      {option.description && (
                        <p className="text-xs text-text-muted truncate">{option.description}</p>
                      )}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-6 text-center text-text-muted text-sm">
                No categories found
              </div>
            )}
          </div>

          {/* Footer */}
          {maxSelections && selected.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 text-xs text-text-muted text-center">
              {selected.length} of {maxSelections} selected
            </div>
          )}
        </div>
      )}
    </div>
  )
}
