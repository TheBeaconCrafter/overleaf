import {
  createContext,
  useContext,
  useState,
  useEffect,
  FC,
  PropsWithChildren,
  useCallback,
} from 'react'

// Helper function to get app-wide theme from cookie or body class
function getAppWideTheme(): 'dark' | 'light' {
  // Check cookie first
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('overleaf_theme='))
    ?.split('=')[1]
  
  if (cookieValue === 'dark' || cookieValue === 'light') {
    return cookieValue
  }
  
  // Fall back to body class
  return document.body.classList.contains('dark-theme-marketing') ? 'dark' : 'light'
}

// Helper function to set app-wide theme
function setAppWideTheme(theme: 'dark' | 'light') {
  // Update cookie
  const date = new Date()
  date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
  document.cookie = `overleaf_theme=${theme};expires=${date.toUTCString()};path=/;SameSite=Lax`
  
  // Update body class
  if (theme === 'dark') {
    document.body.classList.add('dark-theme-marketing')
    document.documentElement.classList.add('dark-theme-marketing-preload')
  } else {
    document.body.classList.remove('dark-theme-marketing')
    document.documentElement.classList.remove('dark-theme-marketing-preload')
  }
  
  // Update theme toggle icon if it exists
  const icon = document.getElementById('theme-icon')
  if (icon) {
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode'
  }
}

type EditorDarkModeContextValue = {
  editorDarkMode: boolean
  toggleEditorDarkMode: () => void
}

const EditorDarkModeContext = createContext<
  EditorDarkModeContextValue | undefined
>(undefined)

export const EditorDarkModeProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  // Initialize from app-wide theme (sync with app theme)
  const [editorDarkMode, setEditorDarkMode] = useState<boolean>(() => {
    return getAppWideTheme() === 'dark'
  })

  // Sync with app-wide theme changes (listen for cookie/class changes)
  useEffect(() => {
    const checkAppTheme = () => {
      const appTheme = getAppWideTheme()
      const isDark = appTheme === 'dark'
      if (isDark !== editorDarkMode) {
        setEditorDarkMode(isDark)
      }
    }

    // Check immediately
    checkAppTheme()

    // Listen for theme changes via MutationObserver (for class changes)
    const observer = new MutationObserver(checkAppTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Also check periodically for cookie changes (in case changed elsewhere)
    const interval = setInterval(checkAppTheme, 1000)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [editorDarkMode])

  // Apply editor-dark-mode class for editor-specific styling
  useEffect(() => {
    // Apply class to body/root element for editor-specific dark mode styling
    if (editorDarkMode) {
      document.documentElement.classList.add('editor-dark-mode')
      document.body.classList.add('editor-dark-mode')
    } else {
      document.documentElement.classList.remove('editor-dark-mode')
      document.body.classList.remove('editor-dark-mode')
    }
  }, [editorDarkMode])

  const toggleEditorDarkMode = useCallback(() => {
    const newTheme = editorDarkMode ? 'light' : 'dark'
    // Update app-wide theme (this will trigger the sync effect above)
    setAppWideTheme(newTheme)
    setEditorDarkMode(newTheme === 'dark')
  }, [editorDarkMode])

  return (
    <EditorDarkModeContext.Provider value={{ editorDarkMode, toggleEditorDarkMode }}>
      {children}
    </EditorDarkModeContext.Provider>
  )
}

export const useEditorDarkMode = (): EditorDarkModeContextValue => {
  const context = useContext(EditorDarkModeContext)
  if (!context) {
    throw new Error('useEditorDarkMode must be used within EditorDarkModeProvider')
  }
  return context
}
