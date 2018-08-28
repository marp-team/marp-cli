import keys from 'bespoke-keys'
import { Key } from 'ts-keycode-enum'

export interface BespokeNavigationOption {
  interval?: number
}

enum Direction {
  X = 'X',
  Y = 'Y',
}

export default function bespokeNavigation(opts: BespokeNavigationOption = {}) {
  const options: BespokeNavigationOption = {
    interval: 200,
    ...opts,
  }

  return deck => {
    keys()(deck)

    document.addEventListener('keydown', e => {
      if (e.which === Key.End) deck.slide(deck.slides.length - 1)
      if (e.which === Key.Home) deck.slide(0)
      if (e.which === Key.UpArrow) deck.prev()
      if (e.which === Key.DownArrow) deck.next()
    })

    let lastWheelNavigationAt = 0
    let lastWheelDelta
    let wheelIntervalTimer

    deck.parent.addEventListener('wheel', e => {
      // Detect scrollable element
      let scrollable = false

      const detectScrollable = (elm: HTMLElement, dir: Direction) => {
        if (elm) scrollable = scrollable || isScrollable(elm, dir)
        if (elm && elm.parentElement) detectScrollable(elm.parentElement, dir)
      }

      if (e.deltaX !== 0) detectScrollable(<HTMLElement>e.target, Direction.X)
      if (e.deltaY !== 0) detectScrollable(<HTMLElement>e.target, Direction.Y)
      if (scrollable) return

      e.preventDefault()

      // Suppress momentum scrolling by trackpad
      if (wheelIntervalTimer) clearTimeout(wheelIntervalTimer)

      wheelIntervalTimer = setTimeout(() => {
        lastWheelDelta = 0
      }, options.interval!)

      const debouncing = Date.now() - lastWheelNavigationAt < options.interval!
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
