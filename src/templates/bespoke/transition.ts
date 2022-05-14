import { classPrefix } from './utils'
import {
  getMarpTransitionKeyframes,
  resolveAnimationStyles,
  prepareMarpTransitions,
  parseTransitionData,
} from './utils/transition'

interface TransitionCallbackOption {
  back?: boolean
  cond: (e: any) => boolean
}

const transitionApply = '_tA' as const
const transitionDuring = '_tD' as const
const transitionKeyOSC = '__bespoke_marp_transition_osc__' as const
const transitionWarmUpClass = 'bespoke-marp-transition-warming-up' as const

const bespokeTransition = (deck) => {
  const createDocumentTransition: any = document['createDocumentTransition']
  if (!createDocumentTransition) return

  let currentFragment: any

  deck[transitionDuring] = false

  const doTransition = async (callback: () => void | Promise<void>) => {
    deck[transitionDuring] = true
    try {
      await callback()
    } finally {
      deck[transitionDuring] = false
    }
  }

  // Prefetch using keyframes
  prepareMarpTransitions(
    ...Array.from(
      document.querySelectorAll<HTMLElement>(
        'section[data-transition], section[data-transition-back]'
      )
    ).flatMap((elm) =>
      [elm.dataset.transition, elm.dataset.transitionBack]
        .flatMap((raw) => {
          const transitionData = parseTransitionData(raw)

          return [
            transitionData?.name,
            transitionData?.bultinFallback
              ? `__builtin__${transitionData.name}`
              : undefined,
          ]
        })
        .filter((v): v is string => !!v)
    )
  )

  const transitionCallback =
    (fn: (e: any) => void, { back, cond }: TransitionCallbackOption) =>
    (e: any) => {
      if (deck[transitionDuring]) return !!e[transitionApply]

      // Check transition
      const current = deck.slides[deck.slide()]
      const isBack = e.back || back
      const transitionDataTarget = `data-transition${isBack ? '-back' : ''}`
      const section: HTMLElement = current.querySelector(
        `section[${transitionDataTarget}]`
      )
      if (!section) return true

      // Check condition
      if (!cond(e)) return true

      // Parse settings
      const transitionData = parseTransitionData(
        section.getAttribute(transitionDataTarget) ?? undefined
      )
      if (!transitionData) return true

      getMarpTransitionKeyframes(transitionData.name).then((keyframes) => {
        if (!keyframes) {
          doTransition(() => fn(e))
          return
        }

        // Set style for transition effect
        const style = document.createElement('style')
        document.head.appendChild(style)

        resolveAnimationStyles(keyframes, {
          backward: isBack,
          duration: transitionData.duration,
        }).forEach((styleText) => style.sheet?.insertRule(styleText))

        try {
          // Start transition
          const setSharedElements = (transition: any) => {
            const osc = document.querySelector(`.${classPrefix}osc`)
            if (osc) transition.setElement(osc, transitionKeyOSC)
          }

          const transition = document['createDocumentTransition']()
          setSharedElements(transition)

          document.documentElement.classList.add(transitionWarmUpClass)

          doTransition(async () => {
            await transition
              .start(async () => {
                fn(e)
                setSharedElements(transition)
                document.documentElement.classList.remove(transitionWarmUpClass)
              })
              .finally(() => {
                style.remove()
                document.documentElement.classList.remove(transitionWarmUpClass)
              })
          })
        } catch (e) {
          deck[transitionDuring] = false
        }
      })

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
