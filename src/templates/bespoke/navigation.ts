export interface BespokeNavigationOption {
  interval?: number
}

enum Direction {
  X = 'X',
  Y = 'Y',
}

export default function bespokeNavigation({
  interval = 200,
}: BespokeNavigationOption = {}) {
  return (deck) => {
    document.addEventListener('keydown', (e) => {
      if (e.which === 32 && e.shiftKey) {
        // Space + Shift: Previous page
        deck.prev()
      } else if (e.which === 33 || e.which === 37 || e.which === 38) {
        // Page Up | LEFT | UP: Previous page (Skip fragments if holding shift)
        deck.prev({ fragment: !e.shiftKey })
      } else if (e.which === 32 && !e.shiftKey) {
        // Space: Next page
        deck.next()
      } else if (e.which === 34 || e.which === 39 || e.which === 40) {
        // Page Down | RIGHT | DOWN: Next page (Skip fragments if holding shift)
        deck.next({ fragment: !e.shiftKey })
      } else if (e.which === 35) {
        // END: Jump to last page
        deck.slide(deck.slides.length - 1, { fragment: -1 })
      } else if (e.which === 36) {
        // HOME: Jump to first page
        deck.slide(0)
      } else {
        return
      }
      e.preventDefault() // Prevent default action when navigated
    })

    let lastWheelNavigationAt = 0
    let lastWheelDelta
    let wheelIntervalTimer

    deck.parent.addEventListener('wheel', (e) => {
      // Detect scrollable element
      let scrollable = false

      const detectScrollable = (elm: HTMLElement, dir: Direction) => {
        if (elm) scrollable = scrollable || isScrollable(elm, dir)
        if (elm?.parentElement) detectScrollable(elm.parentElement, dir)
      }

      if (e.deltaX !== 0) detectScrollable(<HTMLElement>e.target, Direction.X)
      if (e.deltaY !== 0) detectScrollable(<HTMLElement>e.target, Direction.Y)
      if (scrollable) return

      e.preventDefault()

      // Suppress momentum scrolling by trackpad
      if (wheelIntervalTimer) clearTimeout(wheelIntervalTimer)

      wheelIntervalTimer = setTimeout(() => {
        lastWheelDelta = 0
      }, interval)

      const debouncing = Date.now() - lastWheelNavigationAt < interval
      const currentWheelDelta = Math.sqrt(e.deltaX ** 2 + e.deltaY ** 2)
      const attenuated = currentWheelDelta <= lastWheelDelta

      lastWheelDelta = currentWheelDelta

      if (debouncing || attenuated) return

      // Navigate
      let direction

      if (e.deltaX > 0 || e.deltaY > 0) direction = 'next'
      if (e.deltaX < 0 || e.deltaY < 0) direction = 'prev'
      if (!direction) return

      deck[direction]()

      lastWheelNavigationAt = Date.now()
    })
  }
}

function isScrollable(elm: HTMLElement, dir: Direction): boolean {
  return (
    hasScrollableArea(elm, dir) &&
    hasScrollableOverflow(getComputedStyle(elm), dir)
  )
}

function hasScrollableArea(elm: HTMLElement, dir: Direction) {
  const length = dir === Direction.X ? 'Width' : 'Height'
  return elm[`client${length}`] < elm[`scroll${length}`]
}

function hasScrollableOverflow(style: CSSStyleDeclaration, dir: Direction) {
  const { overflow } = style
  const overflowDir = style[`overflow${dir}`]

  return (
    overflow === 'auto' ||
    overflow === 'scroll' ||
    overflowDir === 'auto' ||
    overflowDir === 'scroll'
  )
}
