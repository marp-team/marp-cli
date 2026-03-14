import { classPrefix, readQuery } from '../utils'
import { attachToggleKey } from './utils'

const overviewView = (deck) => {
  const { title } = document
  document.title = `[Overview]${title ? ` - ${title}` : ''}`

  const closeOnSelect = !!readQuery('closeOnSelect')
  const close = () => {
    window.parent.postMessage(
      'closeOverview',
      window.origin === 'null' ? '*' : window.origin
    )
  }

  deck.slides.forEach((el: HTMLElement, i: number) => {
    el.tabIndex = 0

    const select = () => {
      deck.slide(i, { fragment: -1 })
      if (closeOnSelect) close()
    }

    el.addEventListener('click', select)
    el.addEventListener('keydown', (e) => {
      // Entry or space key to select the focused slide
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        select()
      }
    })
  })

  // ULDR keys to navigate slides directly
  window.addEventListener('keydown', (e) => {
    const current = deck.slide()

    const getVerticalTargetIdx = (direction: 1 | -1) => {
      const getCenter = (index: number) => {
        const rect = deck.slides[index].getBoundingClientRect()

        return [
          Math.round((rect.left + rect.right) / 2),
          Math.round((rect.top + rect.bottom) / 2),
        ] as const
      }

      let currentCenter: ReturnType<typeof getCenter> | null = null
      let target = current

      do {
        const targetCenter = getCenter(target)

        if (currentCenter) {
          if (Math.abs(targetCenter[0] - currentCenter[0]) < 2) return target
        } else {
          currentCenter = targetCenter
        }

        target += direction
      } while (target >= 0 && target < deck.slides.length)

      return current // if there is no more slide in the direction
    }

    // Use `slide()` instead of `next()` / `prev()` to fully ignore fragments
    if (e.key === 'ArrowLeft') {
      deck.slide(Math.max(current - 1, 0), { fragment: -1 })
    } else if (e.key === 'ArrowRight') {
      deck.slide(Math.min(current + 1, deck.slides.length - 1), {
        fragment: -1,
      })
    } else if (e.key === 'ArrowUp') {
      deck.slide(getVerticalTargetIdx(-1), { fragment: -1 })
    } else if (e.key === 'ArrowDown') {
      deck.slide(getVerticalTargetIdx(1), { fragment: -1 })
    } else if (e.key === 'End') {
      deck.slide(deck.slides.length - 1, { fragment: -1 })
    } else if (e.key === 'Home') {
      deck.slide(0, { fragment: -1 })
    } else {
      return
    }

    e.preventDefault() // Prevent default action when navigated

    // Focus and scroll the updated slide into view
    const i = deck.slide()
    deck.slides[i]?.focus?.()
    deck.slides[i]?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
    })
  })

  deck.on('slide', ({ index }) => {
    // Run only scrolling the current slide into view
    // (If applied focus, `keydown` event would be over-triggered and cause unexpected behavior)
    deck.slides[index]?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
    })
  })

  if (window.parent !== window) {
    attachToggleKey(close)

    // Header & close button
    const header = document.createElement('header')
    header.className = `${classPrefix}overview-header`

    const closeButton = document.createElement('button')
    closeButton.className = `${classPrefix}overview-close`
    closeButton.type = 'button'
    closeButton.title = 'Close overview'
    closeButton.textContent = closeButton.title
    closeButton.addEventListener('click', close)

    header.append(closeButton)
    document.body.prepend(header)
  }
}

export default overviewView
