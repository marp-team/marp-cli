const bespokeFullscreen = (deck) => {
  const isEnabled = () => !!document.fullscreenEnabled

  deck.fullscreen = () => {
    if (!isEnabled()) return

    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      document.body.requestFullscreen?.()
    }
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
