import { storage } from '../utils'

export const attachToggleKey = (callback: () => void) => {
  // Register keyboard shortcut if using localStorage is not restricted
  if (storage.available)
    document.addEventListener('keydown', (e) => {
      if (
        // `o` without modifier key (Alt, Control, and Command)
        (e.key === 'o' && !e.altKey && !e.ctrlKey && !e.metaKey) ||
        // Escape key
        e.key === 'Escape'
      ) {
        e.preventDefault()
        callback()
      }
    })
}
