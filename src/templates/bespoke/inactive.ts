import { classPrefix } from './utils'

const inactiveClass = `${classPrefix}inactive` as const

const bespokeInactive =
  (timeout = 2000) =>
  ({ parent, fire: _fire }: any) => {
    const classes = parent.classList
    const fireActiveEvent = (isActive?: boolean) =>
      _fire(`marp-${isActive ? '' : 'in'}active`)

    let activeTimer

    const activate = () => {
      if (activeTimer) clearTimeout(activeTimer)

      activeTimer = setTimeout(() => {
        classes.add(inactiveClass)
        fireActiveEvent()
      }, timeout)

      if (classes.contains(inactiveClass)) {
        classes.remove(inactiveClass)
        fireActiveEvent(true)
      }
    }

    for (const ev of ['mousedown', 'mousemove', 'touchend'] as const) {
      document.addEventListener(ev, activate)
    }

    setTimeout(activate, 0)
  }

export default bespokeInactive
