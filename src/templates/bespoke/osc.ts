import { default as screenfull } from 'screenfull'

export default function bespokeOSC(selector: string = '.bespoke-marp-osc') {
  const osc = document.querySelector(selector)
  if (!osc) return () => {}

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
    oscElements('fullscreen', btn => (btn.style.display = 'none'))

  return deck => {
    osc.addEventListener('click', e => {
      if (e.target instanceof HTMLElement) {
        switch (e.target.dataset.bespokeMarpOsc) {
          case 'next':
            deck.next()
            break
          case 'prev':
            deck.prev()
            break
          case 'fullscreen':
            if (typeof deck.fullscreen === 'function' && screenfull.isEnabled)
              deck.fullscreen()
            break
          case 'presenter':
            ;(async () => {
              // In Firefox, the toolbarless window cannot open in fullscreen mode
              if (screenfull.isEnabled && screenfull.isFullscreen)
                await screenfull.exit()

              deck.openPresenterView()
            })()
        }
      }
    })

    deck.parent.appendChild(osc)

    deck.on('activate', ({ index }) => {
      oscElements(
        'page',
        page =>
          (page.textContent = `Page ${index + 1} of ${deck.slides.length}`)
      )
    })

    deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
      oscElements<HTMLButtonElement>(
        'prev',
        prev => (prev.disabled = index === 0 && fragmentIndex === 0)
      )

      oscElements<HTMLButtonElement>(
        'next',
        next =>
          (next.disabled =
            index === deck.slides.length - 1 &&
            fragmentIndex === fragments.length - 1)
      )
    })

    if (screenfull.isEnabled) {
      screenfull.onchange(() =>
        oscElements('fullscreen', fs =>
          fs.classList.toggle(
            'exit',
            screenfull.isEnabled && screenfull.isFullscreen
          )
        )
      )
    }
  }
}
