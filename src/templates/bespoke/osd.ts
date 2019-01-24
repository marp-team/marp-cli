export default function bespokeOSD(selector: string = '.bespoke-marp-osd') {
  const osd = document.querySelector(selector)

  if (!osd) {
    console.error(
      `Bespoke Marp OSD plugin cannot find target selector: ${selector}`
    )
    return () => {}
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
            if (typeof deck.fullscreen === 'function') deck.fullscreen()
        }
      }
    })

    deck.parent.appendChild(osd)
  }
}
