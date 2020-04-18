import { readQuery, setQuery } from './utils'

export interface BespokeStateOption {
  history?: boolean
}

const coerceInt = (ns: string) => {
  const coerced = Number.parseInt(ns, 10)
  return Number.isNaN(coerced) ? null : coerced
}

export default function bespokeState(opts: BespokeStateOption = {}) {
  const options: BespokeStateOption = { history: true, ...opts }

  return (deck) => {
    let internalNavigation = true

    const navInternally = (action: () => any) => {
      const previous = internalNavigation

      try {
        internalNavigation = true
        return action()
      } finally {
        internalNavigation = previous
      }
    }

    const activateSlide = (index: number, fragment: number | null) => {
      const { fragments, slides } = deck
      const idx = Math.max(0, Math.min(index, slides.length - 1))
      const frag = Math.max(
        0,
        Math.min(fragment || 0, fragments[idx].length - 1)
      )

      if (idx !== deck.slide() || frag !== deck.fragmentIndex)
        deck.slide(idx, { fragment: frag })
    }

    const parseState = (opts: any = { fragment: true }) => {
      const page = (coerceInt(location.hash.slice(1)) || 1) - 1
      const fragment = opts.fragment ? coerceInt(readQuery('f') || '') : null

      activateSlide(page, fragment)
    }

    deck.on('fragment', ({ index, fragmentIndex }) => {
      if (internalNavigation) return

      setQuery(
        { f: fragmentIndex === 0 || fragmentIndex.toString() },
        {
          location: { ...location, hash: `#${index + 1}` },
          setter: (...args) =>
            options.history
              ? history.pushState(...args)
              : history.replaceState(...args),
        }
      )
    })

    setTimeout(() => {
      parseState()

      window.addEventListener('hashchange', () =>
        navInternally(() => {
          parseState({ fragment: false })
          setQuery({ f: undefined }) // f parameter has to remove
        })
      )

      window.addEventListener('popstate', () => {
        if (!internalNavigation) navInternally(() => parseState())
      })

      internalNavigation = false
    }, 0)
  }
}
