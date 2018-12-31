import screenfull from 'screenfull'

export default function bespokeFullscreen() {
  document.addEventListener('keydown', e => {
    // `f` or F11 without modifier key Alt, Control, and Command
    if (
      (e.which === 70 || e.which === 122) &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      screenfull.enabled
    ) {
      screenfull.toggle(document.body)
      e.preventDefault()
    }
  })
}
