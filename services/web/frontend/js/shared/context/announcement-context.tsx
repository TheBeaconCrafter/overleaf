import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getJSON, postJSON } from '@/infrastructure/fetch-json'

export type Announcement = {
  _id: string
  title: string
  content: string
  template: 'general' | 'maintenance' | 'info' | 'warning'
  startDate: string | null
  endDate: string | null
  maintenanceDate: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  active: boolean
  _dismissed?: boolean
  _dontShowAgain?: boolean
  _shouldAutoShow?: boolean
}

async function getActiveAnnouncements() {
  return getJSON('/api/announcements/active')
}

async function dismissAnnouncement(id: string, dontShowAgain: boolean) {
  return postJSON(`/api/announcements/${id}/dismiss`, {
    body: { dontShowAgain },
  })
}

type AnnouncementContextValue = {
  announcements: Announcement[]
  currentAnnouncement: Announcement | null
  hasActiveAnnouncements: boolean
  loading: boolean
  showModal: boolean
  setShowModal: (show: boolean) => void
  refresh: () => Promise<void>
  handleDismiss: (dontShowAgain: boolean) => void
  openModal: () => void
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadAnnouncements = async (autoShow = true) => {
    try {
      setLoading(true)
      const data = await getActiveAnnouncements()
      const loadedAnnouncements = data.announcements || []
      console.log('[Announcements] Loaded announcements:', loadedAnnouncements)
      console.log('[Announcements] Count:', loadedAnnouncements.length)
      setAnnouncements(loadedAnnouncements)
      setCurrentIndex(0)
      // Auto-show first announcement if there are any, autoShow is true, and it should auto-show
      if (loadedAnnouncements.length > 0 && autoShow) {
        // Find first announcement that should auto-show
        const firstAutoShowAnnouncement = loadedAnnouncements.find(
          a => a._shouldAutoShow !== false
        )
        if (firstAutoShowAnnouncement) {
          const firstIndex = loadedAnnouncements.indexOf(firstAutoShowAnnouncement)
          setCurrentIndex(firstIndex)
          console.log('[Announcements] Auto-showing announcement:', firstAutoShowAnnouncement)
          // Set showModal in the next tick to ensure state updates properly
          setTimeout(() => {
            setShowModal(true)
          }, 200)
        } else {
          console.log('[Announcements] No announcements should auto-show')
          setShowModal(false)
        }
      } else {
        console.log('[Announcements] No announcements to show or autoShow disabled')
        if (!autoShow) {
          // Don't change showModal state if we're just refreshing
          return
        }
        setShowModal(false)
      }
    } catch (error) {
      console.error('[Announcements] Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh announcements periodically to catch new ones or re-show dismissed ones
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnnouncements(false) // Don't auto-show on periodic refresh
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentAnnouncement = announcements[currentIndex] || null

  const handleDismiss = async (dontShowAgain: boolean) => {
    if (currentAnnouncement) {
      try {
        await dismissAnnouncement(currentAnnouncement._id, dontShowAgain)
      } catch (error) {
        console.error('Error dismissing announcement:', error)
      }
    }

    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1)
      // Show next announcement
      setShowModal(true)
    } else {
      // All announcements dismissed, refresh to get updated list
      // (some might still be visible based on dismissal rules)
      setShowModal(false)
      setCurrentIndex(0)
      // Refresh announcements to see if any are still visible (but don't auto-show)
      await loadAnnouncements(false)
    }
  }

  const openModal = () => {
    if (announcements.length > 0) {
      setCurrentIndex(0)
      setShowModal(true)
    }
  }

  const value: AnnouncementContextValue = {
    announcements,
    currentAnnouncement,
    hasActiveAnnouncements: announcements.length > 0,
    loading,
    showModal,
    setShowModal,
    refresh: loadAnnouncements,
    handleDismiss,
    openModal,
  }

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  )
}

export function useAnnouncements(): AnnouncementContextValue {
  const context = useContext(AnnouncementContext)
  if (!context) {
    // Fallback for components not wrapped in provider
    return {
      announcements: [],
      currentAnnouncement: null,
      hasActiveAnnouncements: false,
      loading: false,
      showModal: false,
      setShowModal: () => {},
      refresh: async () => {},
      handleDismiss: () => {},
      openModal: () => {},
    }
  }
  return context
}

