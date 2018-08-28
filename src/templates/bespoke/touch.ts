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

export default function bespokeTouch(opts: BespokeTouchOption = {}) {
  const options: BespokeTouchOption = {
    slope: Math.tan((-35 * Math.PI) / 180), // -35deg
    swipeThreshold: 30,
    ...opts,
  }

  return deck => {
    let touchStart: TouchPoint | undefined
    const parent: HTMLElement = deck.parent

    const touchPoint = (touch: Touch): TouchPoint => {
      const parentRect = parent.getBoundingClientRect()

      return {
        x: touch.pageX - (parentRect.left + parentRect.right) / 2,
        y: touch.pageY - (parentRect.top + parentRect.bottom) / 2,
      }
    }

    parent.addEventListener('touchstart', e => {
      touchStart = e.touches.length === 1 ? touchPoint(e.touches[0]) : undefined
    })

    parent.addEventListener('touchmove', e => {
      if (touchStart) {
        if (e.touches.length === 1) {
          e.preventDefault()

          const current = touchPoint(e.touches[0])
          const x = current.x - touchStart.x
          const y = current.y - touchStart.y

          touchStart.delta = Math.sqrt(Math.abs(x) ** 2 + Math.abs(y) ** 2)
          touchStart.radian = Math.atan2(x, y)
        } else {
          touchStart = undefined
        }
      }
    })

    parent.addEventListener('touchend', () => {
      if (touchStart) {
        if (touchStart.delta && touchStart.delta >= options.swipeThreshold!) {
          let radian = touchStart.radian! - options.slope!
          radian = ((radian + Math.PI) % (Math.PI * 2)) - Math.PI

          deck[radian < 0 ? 'next' : 'prev']()
        }
        touchStart = undefined
      }
    })
  }
}
