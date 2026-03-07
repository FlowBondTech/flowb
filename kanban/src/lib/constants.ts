export const APP_NAME = 'FlowB Kanban'
export const FLOWB_API = import.meta.env.VITE_FLOWB_API || 'https://flowb.fly.dev'
export const DEV_MODE = import.meta.env.VITE_DEV_AUTH === 'true'
export const DEV_USERS = [
  { id: 'steph', name: 'Steph', password: 'bud' },
  { id: 'koh', name: 'koH', password: 'bud' },
  { id: 'c', name: 'C', password: 'bud' },
] as const
