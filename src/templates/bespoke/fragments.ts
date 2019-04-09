// Based on https://github.com/bespokejs/bespoke-bullets

export default function bespokeFragments(deck) {
  let activeSlideIdx = 0
  let activeFragmentIdx = 0

  const fragments = deck.slides.map(slide => [
    null,
    ...slide.querySelectorAll('[data-marpit-fragment]'),
  ])

  const activeSlideHasFragmentByOffset = (offset: number) =>
    fragments[activeSlideIdx][activeFragmentIdx + offset] !== undefined

  const activate = (slideIdx: number, fragmentIdx: number) => {
    activeSlideIdx = slideIdx
    activeFragmentIdx = fragmentIdx

    fragments.forEach(
      (slideFragments: (HTMLElement | null)[], slideCurrentIdx: number) => {
        slideFragments.forEach((fragment, fragmentCurrentIdx) => {
          if (fragment == null) return

          const active =
            slideCurrentIdx < slideIdx ||
            (slideCurrentIdx === slideIdx && fragmentCurrentIdx <= fragmentIdx)

          fragment.setAttribute(
            'data-bespoke-marp-fragment',
            active ? 'active' : 'inactive'
          )

          if (
            slideCurrentIdx === slideIdx &&
            fragmentCurrentIdx === fragmentIdx
          ) {
            fragment.setAttribute(
              'data-bespoke-marp-current-fragment',
              'current'
            )
          } else {
            fragment.removeAttribute('data-bespoke-marp-current-fragment')
          }
        })
      }
    )

    deck.fire('fragment', {
      slide: deck.slides[slideIdx],
      index: slideIdx,
      fragments: fragments[slideIdx],
      fragmentIndex: fragmentIdx,
    })
  }

  deck.on('next', () => {
    if (activeSlideHasFragmentByOffset(1)) {
      activate(activeSlideIdx, activeFragmentIdx + 1)
      return false
    }

    const nextIdx = activeSlideIdx + 1
    if (fragments[nextIdx]) activate(nextIdx, 0)
  })

  deck.on('prev', () => {
    if (activeSlideHasFragmentByOffset(-1)) {
      activate(activeSlideIdx, activeFragmentIdx - 1)
      return false
    }

    const prevIdx = activeSlideIdx - 1
    if (fragments[prevIdx]) activate(prevIdx, fragments[prevIdx].length - 1)
  })

  deck.on('slide', ({ index, fragment }) => {
    let fragmentPos = 0

    if (fragment !== undefined) {
      const slideFragments = fragments[index]

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
