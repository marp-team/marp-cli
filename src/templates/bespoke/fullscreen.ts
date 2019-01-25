import screenfull from 'screenfull'

export default function bespokeFullscreen(deck) {
  deck.fullscreen = () => {
    screenfull
      .toggle(document.body)
      .then(() => deck.fire('fullscreen', screenfull.isEnabled))
      .catch(e => console.error(e))
  }

  document.addEventListener('keydown', e => {
    // `f` or F11 without modifier key Alt, Control, and Command
    if (
      (e.which === 70 || e.which === 122) &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      screenfull.enabled
    ) {
      deck.fullscreen()
      e.preventDefault()
    }
  })
}
