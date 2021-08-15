import { fullscreen } from './utils'

export default function bespokeFullscreen(deck) {
  deck.fullscreen = () => {
    if (fullscreen.isEnabled()) fullscreen.toggle()
  }

  document.addEventListener('keydown', (e) => {
    // `f` or F11 without modifier key Alt, Control, and Command
    if (
      (e.key === 'f' || e.key === 'F11') &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      fullscreen.isEnabled()
    ) {
      deck.fullscreen()
      e.preventDefault()
    }
  })
}
