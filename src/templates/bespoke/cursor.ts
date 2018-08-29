export default function bespokeCursor(timeout = 2000) {
  return deck => {
    let activeTimer

    function activate() {
      if (activeTimer) clearTimeout(activeTimer)

      activeTimer = setTimeout(() => {
        deck.parent.classList.add('bespoke-marp-cursor-inactive')
      }, timeout)

      deck.parent.classList.remove('bespoke-marp-cursor-inactive')
    }

    document.addEventListener('mousedown', activate)
    document.addEventListener('mousemove', activate)

    setTimeout(activate, 0)
  }
}
