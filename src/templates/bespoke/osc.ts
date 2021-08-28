import { storage, dataAttrPrefix, classPrefix, toggleAriaHidden } from './utils'
import {
  isEnabled as isFullscreenEnabled,
  onChange as onFullscreenChange,
  isFullscreen,
} from './utils/fullscreen'

const bespokeOSC = (selector = `.${classPrefix}osc`) => {
  const osc = document.querySelector<HTMLElement>(selector)

  if (!osc) {
    return () => {
      /* empty */
    }
  }

  const oscElements = <T extends HTMLElement = HTMLElement>(
    type: string,
    callback: (element: T, index?: number) => void
  ) => {
    osc
      .querySelectorAll<T>(`[${dataAttrPrefix}osc=${JSON.stringify(type)}]`)
      .forEach(callback)
  }

  // Hide fullscreen button in not-supported browser (e.g. phone device)
  if (!isFullscreenEnabled())
    oscElements('fullscreen', (btn) => (btn.style.display = 'none'))

  // Disable presenter button if using localStorage is restricted
  if (!storage.available)
    oscElements('presenter', (btn: HTMLButtonElement) => {
      btn.disabled = true
      btn.title = 'Presenter view is disabled due to restricted localStorage.'
    })

  return (deck) => {
    osc.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement) {
        const { bespokeMarpOsc } = e.target.dataset
        if (bespokeMarpOsc) e.target.blur()

        const navOpts = { fragment: !e.shiftKey }

        if (bespokeMarpOsc === 'next') {
          deck.next(navOpts)
        } else if (bespokeMarpOsc === 'prev') {
          deck.prev(navOpts)
        } else if (bespokeMarpOsc === 'fullscreen') {
          deck?.fullscreen()
        } else if (bespokeMarpOsc === 'presenter') {
          deck.openPresenterView()
        }
      }
    })

    deck.parent.appendChild(osc)

    deck.on('activate', ({ index }) => {
      oscElements(
        'page',
        (page) =>
          (page.textContent = `Page ${index + 1} of ${deck.slides.length}`)
      )
    })

    deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
      oscElements<HTMLButtonElement>(
        'prev',
        (prev) => (prev.disabled = index === 0 && fragmentIndex === 0)
      )

      oscElements<HTMLButtonElement>(
        'next',
        (next) =>
          (next.disabled =
            index === deck.slides.length - 1 &&
            fragmentIndex === fragments.length - 1)
      )
    })

    deck.on('marp-active', () => toggleAriaHidden(osc, false))
    deck.on('marp-inactive', () => toggleAriaHidden(osc, true))

    if (isFullscreenEnabled()) {
      onFullscreenChange(() =>
        oscElements('fullscreen', (fs) =>
          fs.classList.toggle('exit', isFullscreenEnabled() && isFullscreen())
        )
      )
    }
  }
}

export default bespokeOSC
