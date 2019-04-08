// Based on https://github.com/bespokejs/bespoke-bullets

export default function bespokeFragments(deck) {
  let activeSlideIdx
  let activeFragmentIdx

  const fragments = deck.slides.map(slide => [
    null,
    ...slide.querySelectorAll('[data-marpit-fragment]'),
  ])

  const activeSlideHasFragmentByOffset = (offset: number) =>
    fragments[activeSlideIdx][activeFragmentIdx + offset] !== undefined

  const activate = (slideIdx, fragmentIdx) => {
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
  }

  const parseFragmentEvent = (
    targetIndex: number,
    fragmentValue: string | number | undefined
  ): number | undefined => {
    if (fragmentValue !== undefined && fragments[targetIndex]) {
      if (fragmentValue === 'last') return fragments[targetIndex].length - 1
      if (typeof fragmentValue === 'number') {
        return Math.min(
          Math.max(0, fragmentValue),
          fragments[targetIndex].length - 1
        )
      }
    }
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

  deck.on('slide', e =>
    activate(e.index, parseFragmentEvent(e.index, e.fragment) || 0)
  )

  activate(0, 0)
}
