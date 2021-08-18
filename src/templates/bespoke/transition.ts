export default function bespokeTransition(deck) {
  const documentTransition: any = document['documentTransition']
  if (!documentTransition) return

  let currentFragment: any

  deck.transitionPreparing = false

  const transitionCallback =
    (
      fn: (e: any) => void,
      {
        back,
        condition,
      }: { back?: boolean; condition?: (e: any) => boolean } = {}
    ) =>
    (e: any) => {
      const current = deck.slides[deck.slide()]
      const section = current.querySelector('section[data-transition]')

      if (!section) return true

      const osc = document.querySelector('.bespoke-marp-osc')
      const sharedElements = osc ? [osc] : undefined

      if (deck.transitionPreparing) {
        if (e.transitionApply) {
          deck.transitionPreparing = false

          try {
            documentTransition.start({ sharedElements }).catch(() => {
              /* no ops */
            })
          } catch (_) {
            /* no ops */
          }

          return true
        }
      } else {
        if (!(condition?.(e) ?? true)) return true

        deck.transitionPreparing = documentTransition
          .prepare({
            rootTransition: back
              ? section.dataset.transitionBack
              : section.dataset.transition,
            sharedElements,
          })
          .then(() => fn(e))
          .catch(() => fn(e))
      }

      return false
    }

  deck.on(
    'prev',
    transitionCallback(
      (e) => {
        deck.prev({ ...e, transitionApply: true })
      },
      {
        back: true,
        condition: (e) =>
          e.index > 0 &&
          !((e.fragment ?? true) && currentFragment.fragmentIndex > 0),
      }
    )
  )

  deck.on(
    'next',
    transitionCallback(
      (e) => {
        deck.next({ ...e, transitionApply: true })
      },
      {
        condition: (e) =>
          e.index + 1 < deck.slides.length &&
          !(
            (e.fragment ?? true) &&
            currentFragment.fragmentIndex + 1 < currentFragment.fragments.length
          ),
      }
    )
  )

  // TODO: add support for fragments
  deck.on(
    'slide',
    transitionCallback((e) => {
      deck.slide(e.index, { ...e, transitionApply: true })
    })
  )

  deck.on('fragment', (e) => {
    currentFragment = e
  })
}
