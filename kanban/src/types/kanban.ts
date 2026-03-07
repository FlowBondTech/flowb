export type ColumnName = 'backlog' | 'todo' | 'in-progress' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type LabelColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'
export type TaskSource = 'human' | 'api' | string // agent names

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

export interface TaskActivity {
  id: string
  task_id: string
  user: string
  action: string // 'created' | 'moved' | 'updated' | 'commented' | 'assigned'
  data: Record<string, unknown>
  created_at: string
}

export interface KanbanTask {
  id: string
  board_id: string
  title: string
  description: string
  column_name: ColumnName
  position: number
  priority: Priority
  assigned_to: string | null
  due_date: string | null
  labels: LabelColor[]
  subtasks: Subtask[]
  blocked_by: string[]
  estimated_hours: number | null
  actual_hours: number | null
  created_by: string
  source: TaskSource
  metadata: Record<string, unknown>
  tags: string[]
  column_entered_at: string
  created_at: string
  updated_at: string
  // FlowB integration
  flowb_user_id?: string
  crew_id?: string
  lead_id?: string
}

export interface KanbanBoard {
  id: string
  name: string
  slug: string
  icon: string
  position: number
  wip_limits: Record<ColumnName, number>
  automations: Record<string, unknown>[]
  created_at: string
}

export interface BoardColumn {
  name: ColumnName
  label: string
  wipLimit: number
  tasks: KanbanTask[]
}

export interface KanbanUser {
  id: string
  name: string
  avatar?: string
}

// Lead types for CRM pipeline
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  stage: LeadStage
  source: string | null
  assigned_to: string | null
  board_id: string | null
  value: number | null
  notes: string | null
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface KanbanNotification {
  id: string
  user_id: string
  type: 'assignment' | 'mention' | 'due_reminder' | 'lead_update' | 'task_moved' | 'comment'
  title: string
  body: string | null
  task_id: string | null
  lead_id: string | null
  board_id: string | null
  from_user: string | null
  read: boolean
  created_at: string
}

export const COLUMNS: { name: ColumnName; label: string }[] = [
  { name: 'backlog', label: 'Backlog' },
  { name: 'todo', label: 'To Do' },
  { name: 'in-progress', label: 'In Progress' },
  { name: 'done', label: 'Done' },
]

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dotColor: string }> = {
  low: { label: 'Low', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', dotColor: 'bg-yellow-400' },
  high: { label: 'High', color: 'text-orange-400', dotColor: 'bg-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400', dotColor: 'bg-red-400' },
}

export const LABEL_COLORS: Record<LabelColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
}

export const USERS: KanbanUser[] = [
  { id: 'steph', name: 'Steph' },
  { id: 'koh', name: 'koH' },
  { id: 'c', name: 'C' },
]
