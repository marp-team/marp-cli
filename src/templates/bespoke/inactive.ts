export default function bespokeInactive(timeout = 2000) {
  return deck => {
    let activeTimer

    function activate() {
      if (activeTimer) clearTimeout(activeTimer)

      activeTimer = setTimeout(() => {
        deck.parent.classList.add('bespoke-marp-inactive')
      }, timeout)

      deck.parent.classList.remove('bespoke-marp-inactive')
    }

    document.addEventListener('mousedown', activate)
    document.addEventListener('mousemove', activate)
    document.addEventListener('touchend', activate)

    setTimeout(activate, 0)
  }
}
