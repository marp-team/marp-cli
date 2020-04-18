import { default as screenfull } from 'screenfull'

export default function bespokeFullscreen(deck) {
  deck.fullscreen = () => {
    if (screenfull.isEnabled) screenfull.toggle(document.body)
  }

  document.addEventListener('keydown', (e) => {
    // `f` or F11 without modifier key Alt, Control, and Command
    if (
      (e.which === 70 || e.which === 122) &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      screenfull.isEnabled
    ) {
      deck.fullscreen()
      e.preventDefault()
    }
  })
}
