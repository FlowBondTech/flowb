import type { LeadStage } from '@/types/kanban'

export const APP_NAME = 'FlowB Kanban'
export const FLOWB_API = import.meta.env.VITE_FLOWB_API || 'https://flowb.fly.dev'
export const DEV_MODE = import.meta.env.VITE_DEV_AUTH === 'true'
export const DEV_USERS = [
  { id: 'steph', name: 'Steph', password: 'bud' },
  { id: 'koh', name: 'koH', password: 'bud' },
  { id: 'c', name: 'C', password: 'bud' },
] as const

export const LEAD_STAGES: {
  name: LeadStage
  label: string
  color: string
  borderColor: string
  bgColor: string
}[] = [
  { name: 'new', label: 'New', color: 'text-blue-600 dark:text-blue-400', borderColor: 'border-t-blue-400 dark:border-t-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'contacted', label: 'Contacted', color: 'text-yellow-600 dark:text-yellow-400', borderColor: 'border-t-yellow-400 dark:border-t-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { name: 'qualified', label: 'Qualified', color: 'text-purple-600 dark:text-purple-400', borderColor: 'border-t-purple-400 dark:border-t-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'proposal', label: 'Proposal', color: 'text-orange-600 dark:text-orange-400', borderColor: 'border-t-orange-400 dark:border-t-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'won', label: 'Won', color: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-t-emerald-400 dark:border-t-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { name: 'lost', label: 'Lost', color: 'text-gray-500 dark:text-gray-400', borderColor: 'border-t-gray-400 dark:border-t-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
]
