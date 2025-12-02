import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  fetchSloptexStatus,
  saveSloptexApiKey,
  deleteSloptexApiKey,
  generateSloptexContent,
} from '../api'
import { debugConsole } from '@/utils/debugging'

type SloptexStatus = {
  enabled: boolean
  hasApiKey: boolean
  defaultModel: string
}

const DISABLED_STATUS: SloptexStatus = {
  enabled: false,
  hasApiKey: false,
  defaultModel: 'gemini-2.5-flash-lite',
}

type SloptexContextValue = {
  status: SloptexStatus | null
  loading: boolean
  saving: boolean
  error: string | null
  refresh: () => void
  saveKey: (key: string) => Promise<void>
  removeKey: () => Promise<void>
  generate: (
    operation: string,
    payload?: { text?: string; options?: Record<string, any> }
  ) => Promise<string>
  panelOpen: boolean
  setPanelOpen: (value: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  settingsOpen: boolean
}

const SloptexContext = createContext<SloptexContextValue | undefined>(
  undefined
)

export function SloptexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [status, setStatus] = useState<SloptexStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const loadStatus = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSloptexStatus()
      setStatus(data)
    } catch (err: any) {
      debugConsole.error('Failed to load sloptex status', err)
      setError(err?.message || 'Unable to load SlopTex status')
      setStatus(prev => prev ?? DISABLED_STATUS)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    if (status === null) {
      loadStatus().catch(() => {})
    }
  }, [status, loadStatus])

  const saveKey = useCallback(
    async (apiKey: string) => {
      setSaving(true)
      try {
        await saveSloptexApiKey(apiKey)
        await loadStatus()
      } finally {
        setSaving(false)
      }
    },
    [loadStatus]
  )

  const removeKey = useCallback(async () => {
    setSaving(true)
    try {
      await deleteSloptexApiKey()
      await loadStatus()
    } finally {
      setSaving(false)
    }
  }, [loadStatus])

  const generate = useCallback(
    async (
      operation: string,
      payload: { text?: string; options?: Record<string, any> } = {}
    ) => {
      const body = {
        operation,
        text: payload.text,
        options: payload.options,
      }
      const response = await generateSloptexContent(body)
      return response.content
    },
    []
  )

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])
  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      status,
      loading,
      saving,
      error,
      refresh: loadStatus,
      saveKey,
      removeKey,
      generate,
      panelOpen,
      setPanelOpen,
      settingsOpen,
      openSettings,
      closeSettings,
    }),
    [
      status,
      loading,
      saving,
      error,
      loadStatus,
      saveKey,
      removeKey,
      generate,
      panelOpen,
      settingsOpen,
      openSettings,
      closeSettings,
    ]
  )

  return (
    <SloptexContext.Provider value={value}>
      {children}
    </SloptexContext.Provider>
  )
}

export function useSloptex() {
  const ctx = useContext(SloptexContext)
  if (!ctx) {
    throw new Error('useSloptex must be used within SloptexProvider')
  }
  return ctx
}

