// Curtesy of Cursor and Claude :/ 

import { useCallback, useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import MaterialIcon from './material-icon'

type Theme = 'light' | 'dark'

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

function setCookie(name: string, value: string, days: number = 365) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = getCookie('overleaf_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }

    return document.body.classList.contains('dark-theme-marketing')
      ? 'dark'
      : 'light'
  })

  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    
    setCookie('overleaf_theme', newTheme)
    
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme-marketing')
    } else {
      document.body.classList.remove('dark-theme-marketing')
    }
  }, [theme])

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme-marketing')
    } else {
      document.body.classList.remove('dark-theme-marketing')
    }
  }, [theme])

  return (
    <Button
      variant="ghost"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <MaterialIcon
        type={theme === 'dark' ? 'light_mode' : 'dark_mode'}
        className="align-middle"
      />
    </Button>
  )
}

