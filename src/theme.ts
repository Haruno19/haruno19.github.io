// Colour themes are blocks of CSS variables in style.css, keyed by
// [data-theme]. `auto` follows the system between the first two.
export const themes = ['auto', 'kuri', 'kuri-light'] as const
export type Theme = (typeof themes)[number]

const storageKey = 'theme'

export function currentTheme(): Theme {
  const saved = localStorage.getItem(storageKey) as Theme | null
  return saved && themes.includes(saved) ? saved : 'auto'
}

export function applyTheme(theme: Theme) {
  if (theme === 'auto') {
    delete document.documentElement.dataset.theme
    localStorage.removeItem(storageKey)
  } else {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(storageKey, theme)
  }
}
