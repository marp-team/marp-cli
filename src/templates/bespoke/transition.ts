import { classPrefix } from './utils'

interface TransitionCallbackOption {
  back?: boolean
  cond: (e: any) => boolean
}

const transitionApply = '_tA' as const
const transitionPreparing = '_tP' as const

const bespokeTransition = (deck) => {
  const documentTransition: any = document['documentTransition']
  if (!documentTransition) return

  let currentFragment: any

  deck[transitionPreparing] = false

  const transitionCallback =
    (fn: (e: any) => void, { back, cond }: TransitionCallbackOption) =>
    (e: any) => {
      const current = deck.slides[deck.slide()]
      const section: HTMLElement = current.querySelector(
        'section[data-transition]'
      )

      if (!section) return true

      const osc = document.querySelector(`.${classPrefix}osc`)
      const sharedElements = osc ? [osc] : undefined

      if (deck[transitionPreparing]) {
        if (e[transitionApply]) {
          deck[transitionPreparing] = false

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
        if (!cond(e)) return true

        const target = `transition${e.back || back ? 'Back' : ''}` as const
        const duration = Number.parseInt(
          section.dataset[`${target}Duration`] ?? '',
          10
        )
        const delay = Number.parseInt(
          section.dataset[`${target}Delay`] ?? '',
          10
        )

        const rootConfig: Record<string, string> = {}
        if (!Number.isNaN(duration)) rootConfig.duration = duration.toString()
        if (!Number.isNaN(delay)) rootConfig.delay = delay.toString()

        deck[transitionPreparing] = documentTransition
          .prepare({
            rootTransition: section.dataset[target],
            rootConfig,
            sharedElements,
          })
          .then(() => fn(e))
          .catch(() => fn(e))
      }

      return false
    }

  deck.on(
    'prev',
    transitionCallback((e) => deck.prev({ ...e, [transitionApply]: true }), {
      back: true,
      cond: (e) =>
        e.index > 0 &&
        !((e.fragment ?? true) && currentFragment.fragmentIndex > 0),
    })
  )

  deck.on(
    'next',
    transitionCallback((e) => deck.next({ ...e, [transitionApply]: true }), {
      cond: (e) =>
        e.index + 1 < deck.slides.length &&
        !(currentFragment.fragmentIndex + 1 < currentFragment.fragments.length),
    })
  )

  setTimeout(() => {
    deck.on(
      'slide',
      transitionCallback(
        (e) => deck.slide(e.index, { ...e, [transitionApply]: true }),
        {
          cond: (e) => {
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

export default bespokeTransition
