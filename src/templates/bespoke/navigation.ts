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

      // Prevent too sensitive navigation on trackpad and magic mouse
      const currentWheelDelta = Math.sqrt(e.deltaX ** 2 + e.deltaY ** 2)

      if (e.wheelDelta !== undefined) {
        if (e.webkitForce === undefined) {
          // [Chromium]
          // Chromium has (a deprecated) wheelDelta value and it is following the
          // pre-defeind WHEEL_DELTA (=120). It means a required delta for
          // scrolling 3 lines. We have set a threshold as 40 (required to scroll
          // 1 line).
          if (Math.abs(e.wheelDelta) < 40) return
        }

        // [WebKit]
        // WebKit's wheelDelta value will just return 3 times numbers from the
        // standard delta values, so using the standard delta will be better
        // than depending on deprecated values.
        //
        // Both of Chromium and Webkit are starting scroll from 4 pixels by a
        // event of the mouse wheel notch. If set a threshold to require 1 line
        // of scroll, the navigation by mouse wheel may be insensitive. So we
        // have set a threshold as 4 pixels.
        //
        // It means Safari is more sensitive to Multi-touch devices than other
        // browsers.
        if (e.deltaMode === e.DOM_DELTA_PIXEL && currentWheelDelta < 4) return
      } else {
        // [Firefox]
        // Firefox only has delta values provided by the standard wheel event.
        //
        // It will report 36 as the delta of the minimum tick for the regular
        // mouse wheel because Firefox's default font size is 12px and 36px is
        // required delta to scroll 3 lines at once.
        if (e.deltaMode === e.DOM_DELTA_PIXEL && currentWheelDelta < 12) return
      }

      // Suppress momentum scrolling by trackpad
      if (wheelIntervalTimer) clearTimeout(wheelIntervalTimer)

      wheelIntervalTimer = setTimeout(() => {
        lastWheelDelta = 0
      }, interval)

      const debouncing = Date.now() - lastWheelNavigationAt < interval
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
