import type React from 'react'
import { createContext, type ReactNode, useCallback, useContext, useReducer } from 'react'

export interface WalletData {
  balance: number
  todayEarnings: number
  weeklyEarnings: number
  totalEarnings: number
  totalEarned?: number
  totalSpent?: number
  streakDays?: number
  streak: number
  bestStreak: number
  lastActiveDate: string
  lastStreakClaim?: string
}

export interface MovementSession {
  id: string
  startTime: Date
  endTime?: Date
  duration: number
  caloriesBurned: number
  danzEarned: number
  movementScore: number
  songCount: number
  peakBPM: number
  averageBPM: number
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'special'
  reward: number
  progress: number
  target: number
  isCompleted: boolean
  isJoined: boolean
  startDate: Date
  endDate: Date
}

export interface Event {
  id: string
  title: string
  facilitator: string
  date: string
  time: string
  duration: number
  location: string
  price: number
  participants: number
  maxParticipants: number
  image?: string
  category: 'salsa' | 'hip-hop' | 'contemporary' | 'ballet' | 'other'
  level: 'all' | 'beginner' | 'intermediate' | 'advanced'
  isSelected?: boolean
  isRegistered?: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category?: 'movement' | 'social' | 'consistency' | 'special'
  unlockedAt?: Date
  progress?: number
  target?: number
  maxProgress?: number
}

export interface DanceBond {
  id: string
  userId?: string
  partnerId: string
  partnerName: string
  partnerAvatar?: string
  level: number
  sharedSessions?: number
  sessionsCount?: number
  createdAt: Date
}

export interface FeedPost {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  media?: {
    type: 'image' | 'video'
    url: string
  }
  likes: number
  comments: number
  isLiked?: boolean
  timestamp: Date
  eventId?: string
  eventName?: string
}

export interface AppState {
  isAuthenticated: boolean // true when we have a privyUser
  isOnboardingComplete: boolean
  isLoading: boolean
  error: string | null

  // Session & Activity
  currentSession: MovementSession | null
  sessionHistory: MovementSession[]
  totalActiveMinutes: number

  // Wallet & Rewards
  wallet: WalletData

  // Social & Community
  feedPosts: FeedPost[]
  danceBonds: DanceBond[]
  selectedBond: DanceBond | null

  // Challenges & Events
  challenges: Challenge[]
  events: Event[]
  selectedEvent: Event | null

  // Modals & UI
  showStreakModal: boolean
  streakData: {
    currentStreak: number
    bestStreak: number
    reward: number
    isNewRecord: boolean
    milestone?: number
    nextMilestone?: number
  } | null
  showDanzNowPopup: boolean
  userLocation: { latitude: number; longitude: number } | null
}

type AppAction =
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DANZ_NOW_POPUP'; payload: boolean }
  | { type: 'UPDATE_WALLET'; payload: Partial<WalletData> }
  | { type: 'SET_FEED_POSTS'; payload: FeedPost[] }
  | { type: 'SET_CHALLENGES'; payload: Challenge[] }
  | { type: 'SET_EVENTS'; payload: Event[] }
  | { type: 'RESET_STATE' }
  | { type: 'SET_ONBOARDING_COMPLETE'; payload: boolean }
  | { type: 'START_SESSION'; payload: MovementSession }
  | {
      type: 'END_SESSION'
      payload: {
        endTime: Date
        caloriesBurned: number
        danzEarned: number
      }
    }
  | { type: 'UPDATE_SESSION'; payload: Partial<MovementSession> }
  | { type: 'ADD_SESSION_TO_HISTORY'; payload: MovementSession }
  | { type: 'JOIN_CHALLENGE'; payload: string }
  | { type: 'UPDATE_CHALLENGE_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'REGISTER_FOR_EVENT'; payload: string }
  | { type: 'SET_SELECTED_EVENT'; payload: Event }
  | { type: 'LIKE_POST'; payload: string }
  | { type: 'ADD_FEED_POST'; payload: FeedPost }
  | { type: 'CREATE_DANCE_BOND'; payload: DanceBond }
  | { type: 'UPDATE_DANCE_BOND'; payload: { id: string; updates: Partial<DanceBond> } }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'SET_USER_LOCATION'; payload: { latitude: number; longitude: number } | null }
  | { type: 'UPDATE_USER_STREAK'; payload: { streak: number; bestStreak: number } }
  | {
      type: 'SHOW_STREAK_MODAL'
      payload: {
        currentStreak: number
        bestStreak: number
        reward: number
        isNewRecord: boolean
        milestone?: number
        nextMilestone?: number
      }
    }
  | { type: 'CLEAR_STREAK_MODAL' }
  | { type: 'ADD_DANZ'; payload: number }

// Initial state
const initialState: AppState = {
  isAuthenticated: false,
  isOnboardingComplete: false,
  isLoading: false,
  error: null,

  currentSession: null,
  sessionHistory: [],
  totalActiveMinutes: 0,

  wallet: {
    balance: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    totalEarnings: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
  },

  feedPosts: [],
  danceBonds: [],
  selectedBond: null,

  challenges: [],
  events: [],
  selectedEvent: null,

  showStreakModal: false,
  streakData: null,
  showDanzNowPopup: false,
  userLocation: null,
}

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'SET_DANZ_NOW_POPUP':
      return { ...state, showDanzNowPopup: action.payload }

    case 'UPDATE_WALLET':
      return { ...state, wallet: { ...state.wallet, ...action.payload } }

    case 'SET_FEED_POSTS':
      return { ...state, feedPosts: action.payload }

    case 'SET_CHALLENGES':
      return { ...state, challenges: action.payload }

    case 'SET_EVENTS':
      return { ...state, events: action.payload }

    case 'RESET_STATE':
      return initialState

    case 'SET_ONBOARDING_COMPLETE':
      return { ...state, isOnboardingComplete: action.payload }

    case 'ADD_DANZ':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          balance: state.wallet.balance + action.payload,
          todayEarnings: state.wallet.todayEarnings + action.payload,
          weeklyEarnings: state.wallet.weeklyEarnings + action.payload,
          totalEarnings: state.wallet.totalEarnings + action.payload,
        },
      }

    case 'START_SESSION':
      return { ...state, currentSession: action.payload }

    case 'END_SESSION': {
      if (!state.currentSession) return state
      const endedSession = { ...state.currentSession, ...action.payload }
      return {
        ...state,
        currentSession: null,
        sessionHistory: [endedSession, ...state.sessionHistory],
        totalActiveMinutes: state.totalActiveMinutes + endedSession.duration / 60,
      }
    }

    case 'UPDATE_SESSION':
      if (!state.currentSession) return state
      return {
        ...state,
        currentSession: { ...state.currentSession, ...action.payload },
      }

    case 'ADD_SESSION_TO_HISTORY':
      return {
        ...state,
        sessionHistory: [action.payload, ...state.sessionHistory],
      }

    case 'JOIN_CHALLENGE':
      return {
        ...state,
        challenges: state.challenges.map(c =>
          c.id === action.payload ? { ...c, isJoined: true } : c,
        ),
      }

    case 'UPDATE_CHALLENGE_PROGRESS':
      return {
        ...state,
        challenges: state.challenges.map(c =>
          c.id === action.payload.id ? { ...c, progress: action.payload.progress } : c,
        ),
      }

    case 'REGISTER_FOR_EVENT':
      return {
        ...state,
        events: state.events.map(e =>
          e.id === action.payload
            ? { ...e, isRegistered: true, participants: e.participants + 1 }
            : e,
        ),
      }

    case 'SET_SELECTED_EVENT': {
      const updatedEvents = state.events.map(event =>
        event.id === action.payload.id
          ? { ...event, isSelected: true }
          : { ...event, isSelected: false },
      )
      return { ...state, events: updatedEvents, selectedEvent: action.payload }
    }

    case 'LIKE_POST':
      return {
        ...state,
        feedPosts: state.feedPosts.map(post =>
          post.id === action.payload
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      }

    case 'ADD_FEED_POST':
      return {
        ...state,
        feedPosts: [
          { ...action.payload, id: Date.now().toString(), timestamp: new Date() },
          ...state.feedPosts,
        ],
      }

    case 'CREATE_DANCE_BOND':
      return {
        ...state,
        danceBonds: [...state.danceBonds, action.payload],
      }

    case 'UPDATE_DANCE_BOND':
      return {
        ...state,
        danceBonds: state.danceBonds.map(bond =>
          bond.id === action.payload.id ? { ...bond, ...action.payload.updates } : bond,
        ),
      }

    case 'SET_USER_LOCATION':
      return { ...state, userLocation: action.payload }

    case 'UPDATE_USER_STREAK':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          streak: action.payload.streak,
          bestStreak: action.payload.bestStreak,
        },
      }

    case 'SHOW_STREAK_MODAL':
      return {
        ...state,
        showStreakModal: true,
        streakData: action.payload,
      }

    case 'CLEAR_STREAK_MODAL':
      return {
        ...state,
        showStreakModal: false,
        streakData: null,
      }

    default:
      return state
  }
}

// Context type
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  startDancing: () => void
  stopDancing: () => void
  endDancing: () => void
  updateDanceSession: (updates: any) => void
  joinChallenge: (challengeId: string) => void
  registerForEvent: (eventId: string) => void
  selectEvent: (event: Event) => void
  likePost: (postId: string) => void
  addFeedPost: (post: Omit<FeedPost, 'id' | 'timestamp'>) => void
  createDanceBond: (partnerId: string, partnerName: string) => void
  setUserLocation: (location: { latitude: number; longitude: number } | null) => void
  closeDanzNowPopup: () => void
  checkAndUpdateStreak: () => void
  clearStreakModal: () => void
  updateUserSubscription: (subscriptionData: any) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider Component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const startDancing = () => {
    const session: MovementSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      duration: 0,
      caloriesBurned: 0,
      danzEarned: 0,
      movementScore: 0,
      songCount: 0,
      peakBPM: 0,
      averageBPM: 0,
    }
    dispatch({ type: 'START_SESSION', payload: session })
  }

  const stopDancing = () => {
    if (state.currentSession) {
      const endTime = new Date()
      const duration = Math.floor(
        (endTime.getTime() - state.currentSession.startTime.getTime()) / 1000,
      )

      // Calculate rewards
      const danzEarned = Math.floor(duration / 60) * 10 // 10 DANZ per minute
      const caloriesBurned = Math.floor(duration * 0.1) // Rough estimate

      dispatch({
        type: 'END_SESSION',
        payload: {
          endTime,
          danzEarned,
          caloriesBurned,
        },
      })

      // Update wallet
      dispatch({ type: 'ADD_DANZ', payload: danzEarned })

      // Check for streaks
      checkAndUpdateStreak()
    }
  }

  const endDancing = stopDancing

  const updateDanceSession = (updates: Partial<MovementSession>) => {
    dispatch({ type: 'UPDATE_SESSION', payload: updates })
  }

  const joinChallenge = (challengeId: string) => {
    dispatch({ type: 'JOIN_CHALLENGE', payload: challengeId })
  }

  const registerForEvent = (eventId: string) => {
    dispatch({ type: 'REGISTER_FOR_EVENT', payload: eventId })
  }

  const likePost = (postId: string) => {
    dispatch({ type: 'LIKE_POST', payload: postId })
  }

  const addFeedPost = (post: Omit<FeedPost, 'id' | 'timestamp'>) => {
    const newPost: FeedPost = {
      ...post,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    dispatch({ type: 'ADD_FEED_POST', payload: newPost })
  }

  const createDanceBond = (partnerId: string, partnerName: string) => {
    const bond: DanceBond = {
      id: Date.now().toString(),
      partnerId,
      partnerName,
      level: 1,
      sharedSessions: 1,
      createdAt: new Date(),
    }
    dispatch({ type: 'CREATE_DANCE_BOND', payload: bond })
  }

  const setUserLocation = (location: { latitude: number; longitude: number } | null) => {
    dispatch({ type: 'SET_USER_LOCATION', payload: location })
  }

  const closeDanzNowPopup = () => {
    dispatch({ type: 'SET_DANZ_NOW_POPUP', payload: false })
  }

  const checkAndUpdateStreak = useCallback(() => {
    const lastActiveDate = new Date(state.wallet.lastActiveDate)
    const today = new Date()
    const daysDiff = Math.floor(
      (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24),
    )

    let newStreak = state.wallet.streak
    let newBestStreak = state.wallet.bestStreak

    if (daysDiff === 0) {
      // Already danced today
      return
    } else if (daysDiff === 1) {
      // Consecutive day
      newStreak += 1
      newBestStreak = Math.max(newStreak, newBestStreak)

      // Check for milestone rewards
      const milestoneRewards: { [key: number]: number } = {
        7: 500,
        30: 2000,
        60: 5000,
        100: 10000,
      }

      const reward = milestoneRewards[newStreak] || 0
      if (reward > 0) {
        dispatch({ type: 'ADD_DANZ', payload: reward })
        dispatch({
          type: 'SHOW_STREAK_MODAL',
          payload: {
            currentStreak: newStreak,
            bestStreak: newBestStreak,
            reward,
            isNewRecord: newStreak > state.wallet.bestStreak,
            milestone: milestoneRewards[newStreak] ? newStreak : undefined,
            nextMilestone:
              Object.keys(milestoneRewards)
                .map(Number)
                .find(m => m > newStreak) || 0,
          },
        })
      }
    } else {
      // Streak broken
      newStreak = 1
    }

    dispatch({
      type: 'UPDATE_USER_STREAK',
      payload: { streak: newStreak, bestStreak: newBestStreak },
    })

    dispatch({
      type: 'UPDATE_WALLET',
      payload: {
        streak: newStreak,
        bestStreak: newBestStreak,
        lastActiveDate: today.toISOString().split('T')[0],
      },
    })
  }, [state.wallet])

  const clearStreakModal = () => {
    dispatch({ type: 'CLEAR_STREAK_MODAL' })
  }

  const value: AppContextType = {
    state,
    dispatch,
    startDancing,
    stopDancing,
    endDancing,
    updateDanceSession,
    joinChallenge,
    registerForEvent,
    likePost,
    addFeedPost,
    createDanceBond,
    setUserLocation,
    closeDanzNowPopup,
    checkAndUpdateStreak,
    clearStreakModal,
    selectEvent: (event: Event): void => {
      throw new Error('Function not implemented.')
    },
    updateUserSubscription: (subscriptionData: any): Promise<void> => {
      throw new Error('Function not implemented.')
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
