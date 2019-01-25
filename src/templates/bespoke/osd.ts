import screenfull from 'screenfull'

export default function bespokeOSD(selector: string = '.bespoke-marp-osd') {
  const osd = document.querySelector(selector)

  if (!osd) {
    return () =>
      console.error(
        `Bespoke Marp OSD plugin cannot find target selector: ${selector}`
      )
  }

  // Hide fullscreen button in not-supported browser (e.g. phone device)
  if (!screenfull.enabled) {
    Array.from(
      osd.querySelectorAll<HTMLElement>('[data-bespoke-marp-osd="fullscreen"]'),
      btn => (btn.style.display = 'none')
    )
  }

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
  }
}
