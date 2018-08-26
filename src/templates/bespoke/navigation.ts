import keys from 'bespoke-keys'

export default function bespokeNavigation(deck) {
  keys()(deck)

  document.addEventListener('keydown', e => {
    if (e.which === 35) deck.slide(deck.slides.length - 1) // End
    if (e.which === 36) deck.slide(0) // Home
    if (e.which === 38) deck.prev() // UP
    if (e.which === 40) deck.next() // DOWN
  })

  document.addEventListener('wheel', e => {
    // Detect scrollable
    let isScrollable = false

    const applyRecrusive = (elm: HTMLElement, target: 'Width' | 'Height') => {
      const func = (el: HTMLElement) => {
        if (el[`client${target}`] < el[`scroll${target}`]) {
          const style = getComputedStyle(el)
          const allows = ['auto', 'scroll']
          const overflowDir = style[`overflow${target === 'Width' ? 'X' : 'Y'}`]

          if (
            allows.includes(style.overflow || '') ||
            allows.includes(overflowDir || '')
          )
            isScrollable = true
        }
      }

      if (elm) func(elm)
      if (elm && elm.parentElement) applyRecrusive(elm.parentElement, target)
    }

    if (e.deltaY !== 0) applyRecrusive(<HTMLElement>e.target, 'Height')
    if (e.deltaX !== 0) applyRecrusive(<HTMLElement>e.target, 'Width')
    if (isScrollable) return

    // Navigate slide deck
    if (e.deltaX > 0 || e.deltaY > 0) {
      deck.next()
      e.preventDefault()
    }

    if (e.deltaX < 0 || e.deltaY < 0) {
      deck.prev()
      e.preventDefault()
    }
  })
}
