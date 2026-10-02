import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'splitwise-theme'

/**
 * The key the no-flash script in index.html writes onto <html>. Kept in sync by
 * hand -- if these ever diverge, the page flashes the wrong theme on load.
 */
const DARK_CLASS = 'dark'

interface ThemeContextValue {
  /** What the user picked, including "system". */
  theme: Theme
  /** What is actually applied right now, with "system" resolved. */
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    resolve(readStoredTheme()),
  )

  useEffect(() => {
    const apply = () => {
      const next = resolve(theme)
      setResolved(next)

      const root = document.documentElement
      root.classList.toggle(DARK_CLASS, next === 'dark')
      // Keeps form controls, scrollbars and the canvas background in step. Some
      // browsers still use it for the default page background.
      root.style.colorScheme = next
    }

    apply()

    if (theme !== 'system' || !window.matchMedia) return

    // Follow the OS while the preference is "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)

    try {
      if (next === 'system') window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing or a blocked storage partition. The theme still
      // applies for this session; it just will not be remembered.
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(resolve(theme) === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider')
  }
  return context
}

// Read by the inline script in index.html so the class is on <html> before the
// first paint. Without it the page renders light and then flips.
export const THEME_STORAGE_KEY = STORAGE_KEY