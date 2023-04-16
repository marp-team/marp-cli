import { readQuery, setQuery } from './utils'

export interface BespokeStateOption {
  history?: boolean
}

const coerceInt = (ns: string) => {
  const coerced = Number.parseInt(ns, 10)
  return Number.isNaN(coerced) ? null : coerced
}

const bespokeState = (opts: BespokeStateOption = {}) => {
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
      const { min, max } = Math
      const { fragments, slides } = deck
      const idx = max(0, min(index, slides.length - 1))
      const frag = max(0, min(fragment || 0, fragments[idx].length - 1))

      if (idx !== deck.slide() || frag !== deck.fragmentIndex)
        deck.slide(idx, { fragment: frag })
    }

    const parseState = (opts: any = { fragment: true }) => {
      let fragment = opts.fragment ? coerceInt(readQuery('f') || '') : null

      const page = (() => {
        if (location.hash) {
          // Support text fragments: https://web.dev/text-fragments/
          const [hashWithoutDelimiter] = location.hash.slice(1).split(':~:')

          const numMatcher = /^\d+$/.test(hashWithoutDelimiter)
          if (numMatcher) return (coerceInt(hashWithoutDelimiter) ?? 1) - 1

          const anchorTarget =
            document.getElementById(hashWithoutDelimiter) ||
            document.querySelector(
              `a[name="${CSS.escape(hashWithoutDelimiter)}"]`
            )

          if (anchorTarget) {
            const { length } = deck.slides

            for (let i = 0; i < length; i += 1) {
              if (deck.slides[i].contains(anchorTarget)) {
                // Detect the fragmented list in the parent element
                const pageFragments = deck.fragments?.[i]
                const fragmentElement = anchorTarget.closest(
                  '[data-marpit-fragment]'
                )

                if (pageFragments && fragmentElement) {
                  const fragmentIndex = pageFragments.indexOf(fragmentElement)
                  console.log(fragmentIndex)
                  if (fragmentIndex >= 0) fragment = fragmentIndex
                }

                return i
              }
            }
          }
        }
        return 0
      })()

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

export default bespokeState
