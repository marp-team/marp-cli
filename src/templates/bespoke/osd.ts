import screenfull from 'screenfull'

export default function bespokeOSD(selector: string = '.bespoke-marp-osd') {
  const osd = document.querySelector(selector)

  if (!osd) {
    return () =>
      console.error(
        `Bespoke Marp OSD plugin cannot find target selector: ${selector}`
      )
  }

  const osdElements = <T extends HTMLElement = HTMLElement>(
    type: string,
    callback: (element: T) => void
  ) => {
    Array.from(
      osd.querySelectorAll<T>(
        `[data-bespoke-marp-osd=${JSON.stringify(type)}]`
      ),
      callback
    )
  }

  // Hide fullscreen button in not-supported browser (e.g. phone device)
  if (!screenfull.enabled)
    osdElements('fullscreen', btn => (btn.style.display = 'none'))

  return deck => {
    osd.addEventListener('click', e => {
      if (e.target instanceof HTMLElement) {
        switch (e.target.dataset.bespokeMarpOsd) {
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

    deck.parent.appendChild(osd)

    deck.on('activate', ({ index }) => {
      osdElements(
        'page',
        page => (page.innerText = `Page ${index + 1} of ${deck.slides.length}`)
      )

      osdElements<HTMLButtonElement>(
        'prev',
        prev => (prev.disabled = index === 0)
      )

      osdElements<HTMLButtonElement>(
        'next',
        next => (next.disabled = index === deck.slides.length - 1)
      )
    })

    deck.on('fullscreen', enabled =>
      osdElements('fullscreen', fs => fs.classList.toggle('exit', enabled))
    )
  }
}
