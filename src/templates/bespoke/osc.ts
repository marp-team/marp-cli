import screenfull from 'screenfull'

export default function bespokeOSC(selector: string = '.bespoke-marp-osc') {
  const osc = document.querySelector(selector)
  if (!osc) return () => {}

  const oscElements = <T extends HTMLElement = HTMLElement>(
    type: string,
    callback: (element: T) => void
  ) => {
    Array.from(
      osc.querySelectorAll<T>(
        `[data-bespoke-marp-osc=${JSON.stringify(type)}]`
      ),
      callback
    )
  }

  // Hide fullscreen button in not-supported browser (e.g. phone device)
  if (!screenfull.enabled)
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
            if (typeof deck.fullscreen === 'function' && screenfull.enabled)
              deck.fullscreen()
        }
      }
    })

    deck.parent.appendChild(osc)

    deck.on('activate', ({ index }) => {
      oscElements(
        'page',
        page => (page.innerText = `Page ${index + 1} of ${deck.slides.length}`)
      )

      oscElements<HTMLButtonElement>(
        'prev',
        prev => (prev.disabled = index === 0)
      )

      oscElements<HTMLButtonElement>(
        'next',
        next => (next.disabled = index === deck.slides.length - 1)
      )
    })

    deck.on('fullscreen', enabled =>
      oscElements('fullscreen', fs => fs.classList.toggle('exit', enabled))
    )
  }
}
