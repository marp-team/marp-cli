import screenfull from 'screenfull'

export default function bespokeFullscreen({ parent }) {
  document.addEventListener('keydown', e => {
    // `f` or F11
    if ((e.which === 70 || e.which === 122) && screenfull.enabled)
      screenfull.toggle(parent)
  })
}
