export interface BespokeTouchOption {
  slope?: number
  swipeThreshold?: number
}

export interface TouchPoint {
  x: number
  y: number
  radian?: number
  delta?: number
}

const { PI, abs, sqrt, atan2 } = Math
const passiveEventOpts = { passive: true } as const

const bespokeTouch =
  ({
    slope = -0.7, // about -35deg = Math.tan((-35 * Math.PI) / 180)
    swipeThreshold = 30,
  }: BespokeTouchOption = {}) =>
  (deck) => {
    let touchStart: TouchPoint | undefined
    const parent: HTMLElement = deck.parent

    const touchPoint = (touch: Touch): TouchPoint => {
      const parentRect = parent.getBoundingClientRect()

      return {
        x: touch.pageX - (parentRect.left + parentRect.right) / 2,
        y: touch.pageY - (parentRect.top + parentRect.bottom) / 2,
      }
    }

    parent.addEventListener(
      'touchstart',
      ({ touches }) => {
        touchStart = touches.length === 1 ? touchPoint(touches[0]) : undefined
      },
      passiveEventOpts
    )

    parent.addEventListener('touchmove', (e) => {
      if (touchStart) {
        if (e.touches.length === 1) {
          e.preventDefault()

          const current = touchPoint(e.touches[0])
          const x = current.x - touchStart.x
          const y = current.y - touchStart.y

          touchStart.delta = sqrt(abs(x) ** 2 + abs(y) ** 2)
          touchStart.radian = atan2(x, y)
        } else {
          touchStart = undefined
        }
      }
    })

    parent.addEventListener(
      'touchend',
      (e) => {
        if (touchStart) {
          if (
            touchStart.delta &&
            touchStart.delta >= swipeThreshold &&
            touchStart.radian
          ) {
            const radian = ((touchStart.radian - slope + PI) % (PI * 2)) - PI

            deck[radian < 0 ? 'next' : 'prev']()
            e.stopPropagation()
          }
          touchStart = undefined
        }
      },
      passiveEventOpts
    )
  }

export default bespokeTouch
