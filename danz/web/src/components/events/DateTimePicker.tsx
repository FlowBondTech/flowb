'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiX } from 'react-icons/fi'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minDate?: Date
  required?: boolean
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date & time',
  minDate,
  required,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date')
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value)
    return new Date()
  })

  // Parse the current value
  const selectedDate = value ? new Date(value) : null
  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : ''
  const selectedHour = selectedDate ? selectedDate.getHours() : 12
  const selectedMinute = selectedDate ? selectedDate.getMinutes() : 0

  // Temp state for picking
  const [tempDate, setTempDate] = useState(selectedDateStr)
  const [tempHour, setTempHour] = useState(selectedHour)
  const [tempMinute, setTempMinute] = useState(selectedMinute)

  // Update temp state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setTempDate(selectedDateStr)
        setTempHour(selectedDate.getHours())
        setTempMinute(selectedDate.getMinutes())
        setViewDate(selectedDate)
      } else {
        const now = new Date()
        setTempDate('')
        setTempHour(now.getHours())
        setTempMinute(0)
        setViewDate(now)
      }
    }
  }, [isOpen])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: { date: Date; isCurrentMonth: boolean; isDisabled: boolean }[] = []

    // Previous month days
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: minDate ? date < new Date(minDate.setHours(0, 0, 0, 0)) : false,
      })
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: minDate ? date < today : false,
      })
    }

    // Next month days (fill to 42 for 6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isDisabled: false })
    }

    return days
  }, [viewDate, minDate])

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setTempDate(dateStr)
    // Auto-advance to time picker
    setTimeout(() => setActiveTab('time'), 200)
  }

  const handleConfirm = () => {
    if (tempDate) {
      const [year, month, day] = tempDate.split('-').map(Number)
      const dateTime = new Date(year, month - 1, day, tempHour, tempMinute)
      // Format for datetime-local input: YYYY-MM-DDTHH:MM
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`
      onChange(formatted)
    }
    setIsOpen(false)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (date: Date) => {
    if (!tempDate) return false
    const [year, month, day] = tempDate.split('-').map(Number)
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year
  }

  const formatDisplayValue = () => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Generate hour options
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12} ${period}`
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-white/5 text-text-primary rounded-xl px-4 py-3.5 border border-white/10 focus:border-neon-purple/50 focus:outline-none hover:bg-white/10 transition-colors text-left flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
          <FiCalendar className="w-5 h-5 text-neon-purple" />
        </div>
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-xs text-text-secondary mb-0.5">
              {label}
              {required && ' *'}
            </p>
          )}
          <p className={`truncate ${value ? 'text-text-primary' : 'text-text-secondary'}`}>
            {formatDisplayValue() || placeholder}
          </p>
        </div>
        <FiChevronRight className="w-5 h-5 text-text-secondary" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-bg-secondary rounded-t-3xl sm:rounded-2xl border border-white/10 w-full sm:max-w-md max-h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">
                  {label || 'Select Date & Time'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-2 gap-2 border-b border-white/10">
                <button
                  onClick={() => setActiveTab('date')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium ${
                    activeTab === 'date'
                      ? 'bg-neon-purple text-text-primary'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  <FiCalendar className="w-4 h-4" />
                  Date
                  {tempDate && <span className="w-2 h-2 rounded-full bg-green-500" />}
                </button>
                <button
                  onClick={() => setActiveTab('time')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium ${
                    activeTab === 'time'
                      ? 'bg-neon-purple text-text-primary'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  <FiClock className="w-4 h-4" />
                  Time
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <AnimatePresence mode="wait">
                  {activeTab === 'date' ? (
                    <motion.div
                      key="date"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={goToPrevMonth}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <FiChevronLeft className="w-5 h-5" />
                        </button>
                        <h4 className="text-lg font-bold text-text-primary">
                          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </h4>
                        <button
                          onClick={goToNextMonth}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <FiChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(day => (
                          <div
                            key={day}
                            className="text-center text-xs text-text-secondary py-2 font-medium"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => (
                          <button
                            key={index}
                            onClick={() => !day.isDisabled && handleDateSelect(day.date)}
                            disabled={day.isDisabled}
                            className={`
                              aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                              ${!day.isCurrentMonth ? 'text-text-secondary/30' : ''}
                              ${day.isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}
                              ${isToday(day.date) && !isSelected(day.date) ? 'ring-2 ring-neon-purple/50' : ''}
                              ${isSelected(day.date) ? 'bg-neon-purple text-text-primary' : ''}
                            `}
                          >
                            {day.date.getDate()}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="time"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {/* Time Display */}
                      <div className="text-center mb-6">
                        <p className="text-4xl font-bold text-text-primary mb-2">
                          {String(
                            tempHour === 0 ? 12 : tempHour > 12 ? tempHour - 12 : tempHour,
                          ).padStart(2, '0')}
                          :{String(tempMinute).padStart(2, '0')}
                          <span className="text-lg ml-2 text-neon-purple">
                            {tempHour >= 12 ? 'PM' : 'AM'}
                          </span>
                        </p>
                        {tempDate && (
                          <p className="text-text-secondary text-sm">
                            {new Date(tempDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>

                      {/* Hour Selection */}
                      <div className="mb-4">
                        <p className="text-sm text-text-secondary mb-2 font-medium">Hour</p>
                        <div className="grid grid-cols-6 gap-2">
                          {hours.map(h => (
                            <button
                              key={h}
                              onClick={() => setTempHour(h)}
                              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                tempHour === h
                                  ? 'bg-neon-purple text-text-primary'
                                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
                              }`}
                            >
                              {formatHour(h)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Minute Selection */}
                      <div>
                        <p className="text-sm text-text-secondary mb-2 font-medium">Minute</p>
                        <div className="grid grid-cols-6 gap-2">
                          {minutes.map(m => (
                            <button
                              key={m}
                              onClick={() => setTempMinute(m)}
                              className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                                tempMinute === m
                                  ? 'bg-neon-purple text-text-primary'
                                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
                              }`}
                            >
                              :{String(m).padStart(2, '0')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 bg-white/10 text-text-primary rounded-xl hover:bg-white/20 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!tempDate}
                  className="flex-1 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <FiCheck className="w-5 h-5" />
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
