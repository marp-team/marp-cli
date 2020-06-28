export default function bespokeInactive(timeout = 2000) {
  return (deck) => {
    let activeTimer

    function activate() {
      if (activeTimer) clearTimeout(activeTimer)

      activeTimer = setTimeout(() => {
        deck.parent.classList.add('bespoke-marp-inactive')
        deck.fire('marp-inactive')
      }, timeout)

      if (deck.parent.classList.contains('bespoke-marp-inactive')) {
        deck.parent.classList.remove('bespoke-marp-inactive')
        deck.fire('marp-active')
      }
    }

    document.addEventListener('mousedown', activate)
    document.addEventListener('mousemove', activate)
    document.addEventListener('touchend', activate)

    setTimeout(activate, 0)
  }
}
