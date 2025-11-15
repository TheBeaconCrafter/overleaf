// Theme toggle for marketing pages
type Theme = 'light' | 'dark'

// Cookie helper functions
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

function getCurrentTheme(): Theme {
  return document.body.classList.contains('dark-theme-marketing')
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme-marketing')
  } else {
    document.body.classList.remove('dark-theme-marketing')
  }
}

function updateToggleIcon(theme: Theme) {
  const icon = document.getElementById('theme-icon')
  if (icon) {
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode'
  }
}

function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn')
  if (!toggleBtn) return

  // Get initial theme from cookie or current state
  const savedTheme = getCookie('overleaf_theme') as Theme | null
  const currentTheme = savedTheme || getCurrentTheme()
  
  // Apply saved theme if different from current
  if (savedTheme && savedTheme !== getCurrentTheme()) {
    applyTheme(savedTheme)
  }
  
  // Set initial icon
  updateToggleIcon(currentTheme)

  // Add click handler
  toggleBtn.addEventListener('click', () => {
    const currentTheme = getCurrentTheme()
    const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
    
    // Apply theme
    applyTheme(newTheme)
    
    // Save to cookie
    setCookie('overleaf_theme', newTheme)
    
    // Update icon
    updateToggleIcon(newTheme)
  })
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle)
} else {
  initThemeToggle()
}

