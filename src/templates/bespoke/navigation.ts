export interface BespokeNavigationOption {
  interval?: number
}

enum Direction {
  X = 'X',
  Y = 'Y',
}

export default function bespokeNavigation({
  interval = 250,
}: BespokeNavigationOption = {}) {
  return (deck) => {
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && e.shiftKey) {
        deck.prev() // Previous page
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp'
      ) {
        deck.prev({ fragment: !e.shiftKey }) // Previous page (Skip fragments if holding shift)
      } else if (e.key === ' ' && !e.shiftKey) {
        deck.next() // Next page
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageDown'
      ) {
        deck.next({ fragment: !e.shiftKey }) // Next page (Skip fragments if holding shift)
      } else if (e.key === 'End') {
        deck.slide(deck.slides.length - 1, { fragment: -1 }) // Jump to last page
      } else if (e.key === 'Home') {
        deck.slide(0) // Jump to first page
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

      // Prevent too sensitive navigation on trackpad
      if (Math.abs(e.wheelDelta) < 60) return

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
