// Based on https://github.com/bespokejs/bespoke-hash

export interface BespokeHashOption {
  history?: boolean
}

export default function bespokeHash(opts: BespokeHashOption = {}) {
  const options: BespokeHashOption = {
    history: true,
    ...opts,
  }

  return deck => {
    function activateSlide(index) {
      const idx = Math.max(0, Math.min(index, deck.slides.length - 1))
      if (idx !== deck.slide()) deck.slide(idx)
    }

    function parseHash() {
      const pageNumber = parseInt(window.location.hash.slice(1), 10)
      if (!Number.isNaN(pageNumber)) activateSlide(pageNumber - 1)
    }

    setTimeout(() => {
      parseHash()

      deck.on('activate', e => {
        if (options.history) {
          window.location.hash = e.index + 1
        } else {
          window.location.replace(`#${e.index + 1}`)
        }
      })

      window.addEventListener('hashchange', parseHash)
    }, 0)
  }
}
