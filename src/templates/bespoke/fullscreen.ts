import { isEnabled, toggle } from './utils/fullscreen'

const bespokeFullscreen = (deck) => {
  deck.fullscreen = () => {
    if (isEnabled()) toggle()
  }

  document.addEventListener('keydown', (e) => {
    // `f` or F11 without modifier key Alt, Control, and Command
    if (
      (e.key === 'f' || e.key === 'F11') &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      isEnabled()
    ) {
      deck.fullscreen()
      e.preventDefault()
    }
  })
}

export default bespokeFullscreen
