import { dataAttrPrefix } from './utils'

export interface FragmentEvent {
  slide: any[]
  index: number
  fragments: any[]
  fragmentIndex: number
}

// Based on https://github.com/bespokejs/bespoke-bullets
const bespokeFragments = (deck) => {
  let activeSlideIdx = 0
  let activeFragmentIdx = 0

  Object.defineProperty(deck, 'fragments', {
    enumerable: true,
    value: deck.slides.map((slide) => [
      null,
      ...slide.querySelectorAll('[data-marpit-fragment]'),
    ]),
  })

  const activeSlideHasFragmentByOffset = (offset: number) =>
    deck.fragments[activeSlideIdx][activeFragmentIdx + offset] !== undefined

  const activate = (slideIdx: number, fragmentIdx: number) => {
    activeSlideIdx = slideIdx
    activeFragmentIdx = fragmentIdx

    deck.fragments.forEach(
      (slideFragments: (HTMLElement | null)[], slideCurrentIdx: number) => {
        slideFragments.forEach((fragment, fragmentCurrentIdx) => {
          if (fragment == null) return

          const active =
            slideCurrentIdx < slideIdx ||
            (slideCurrentIdx === slideIdx && fragmentCurrentIdx <= fragmentIdx)

          fragment.setAttribute(
            `${dataAttrPrefix}fragment`,
            `${active ? '' : 'in'}active`
          )

          const dataAttrCurrentFragment = `${dataAttrPrefix}current-fragment`

          if (
            slideCurrentIdx === slideIdx &&
            fragmentCurrentIdx === fragmentIdx
          ) {
            fragment.setAttribute(dataAttrCurrentFragment, 'current')
          } else {
            fragment.removeAttribute(dataAttrCurrentFragment)
          }
        })
      }
    )

    deck.fragmentIndex = fragmentIdx

    const fragmentEvent: FragmentEvent = {
      slide: deck.slides[slideIdx],
      index: slideIdx,
      fragments: deck.fragments[slideIdx],
      fragmentIndex: fragmentIdx,
    }

    deck.fire('fragment', fragmentEvent)
  }

  deck.on('next', ({ fragment = true }) => {
    if (fragment) {
      if (activeSlideHasFragmentByOffset(1)) {
        activate(activeSlideIdx, activeFragmentIdx + 1)
        return false
      }

      const nextIdx = activeSlideIdx + 1
      if (deck.fragments[nextIdx]) activate(nextIdx, 0)
    } else {
      const fragmentSize = deck.fragments[activeSlideIdx].length

      if (activeFragmentIdx + 1 < fragmentSize) {
        activate(activeSlideIdx, fragmentSize - 1)
        return false
      }

      const nextFragments = deck.fragments[activeSlideIdx + 1]
      if (nextFragments) activate(activeSlideIdx + 1, nextFragments.length - 1)
    }
  })

  deck.on('prev', ({ fragment = true }) => {
    if (activeSlideHasFragmentByOffset(-1) && fragment) {
      activate(activeSlideIdx, activeFragmentIdx - 1)
      return false
    }

    const prevIdx = activeSlideIdx - 1

    if (deck.fragments[prevIdx])
      activate(prevIdx, deck.fragments[prevIdx].length - 1)
  })

  deck.on('slide', ({ index, fragment }) => {
    let fragmentPos = 0

    if (fragment !== undefined) {
      const slideFragments = deck.fragments[index]

      if (slideFragments) {
        const { length } = slideFragments

        if (fragment === -1) {
          fragmentPos = length - 1
        } else {
          fragmentPos = Math.min(Math.max(fragment, 0), length - 1)
        }
      }
    }

    activate(index, fragmentPos)
  })

  activate(0, 0)
}

export default bespokeFragments
