interface TransitionCallbackOption {
  back?: boolean
  condition?: (e: any) => boolean
}

export default function bespokeTransition(deck) {
  const documentTransition: any = document['documentTransition']
  if (!documentTransition) return

  let currentFragment: any

  deck.transitionPreparing = false

  const transitionCallback =
    (
      fn: (e: any) => void,
      { back, condition }: TransitionCallbackOption = {}
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
            rootTransition:
              e.back || back
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
    transitionCallback((e) => deck.prev({ ...e, transitionApply: true }), {
      back: true,
      condition: (e) =>
        e.index > 0 &&
        !((e.fragment ?? true) && currentFragment.fragmentIndex > 0),
    })
  )

  deck.on(
    'next',
    transitionCallback((e) => deck.next({ ...e, transitionApply: true }), {
      condition: (e) =>
        e.index + 1 < deck.slides.length &&
        !(currentFragment.fragmentIndex + 1 < currentFragment.fragments.length),
    })
  )

  setTimeout(() => {
    deck.on(
      'slide',
      transitionCallback(
        (e) => deck.slide(e.index, { ...e, transitionApply: true }),
        {
          condition: (e) => {
            const currentIndex = deck.slide()
            if (e.index === currentIndex) return false

            e.back = e.index < currentIndex
            return true
          },
        }
      )
    )
  }, 0)

  deck.on('fragment', (e) => {
    currentFragment = e
  })
}
