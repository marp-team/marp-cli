import { default as screenfull } from 'screenfull'
import { storage } from './utils'

export default function bespokeOSC(selector = '.bespoke-marp-osc') {
  const osc = document.querySelector<HTMLElement>(selector)
  if (!osc) return () => {} // eslint-disable-line @typescript-eslint/no-empty-function

  const oscElements = <T extends HTMLElement = HTMLElement>(
    type: string,
    callback: (element: T, index?: number) => void
  ) => {
    osc
      .querySelectorAll<T>(`[data-bespoke-marp-osc=${JSON.stringify(type)}]`)
      .forEach(callback)
  }

  // Hide fullscreen button in not-supported browser (e.g. phone device)
  if (!screenfull.isEnabled)
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

        switch (bespokeMarpOsc) {
          case 'next':
            deck.next({ fragment: !e.shiftKey })
            break
          case 'prev':
            deck.prev({ fragment: !e.shiftKey })
            break
          case 'fullscreen':
            if (typeof deck.fullscreen === 'function' && screenfull.isEnabled)
              deck.fullscreen()
            break
          case 'presenter':
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

    deck.on('marp-active', () => osc.removeAttribute('aria-hidden'))
    deck.on('marp-inactive', () => osc.setAttribute('aria-hidden', 'true'))

    if (screenfull.isEnabled) {
      screenfull.onchange(() =>
        oscElements('fullscreen', (fs) =>
          fs.classList.toggle(
            'exit',
            screenfull.isEnabled && screenfull.isFullscreen
          )
        )
      )
    }
  }
}
