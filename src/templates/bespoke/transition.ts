import {
  getMarpTransitionKeyframes,
  resolveAnimationStyles,
  prepareMarpTransitions,
  parseTransitionData,
  MarpTransitionKeyframes,
} from './utils/transition'

interface TransitionCallbackOption {
  back?: boolean
  cond: (e: any) => boolean
}

interface DocumentTransition {
  start(callback: () => void): Promise<void>
  setElement(element: Element, tag: string, options?: any): void
  abandon(): void
}

export const transitionStyleId = '_tSId' as const

const transitionApply = '_tA' as const
const transitionDuring = '_tD' as const
const transitionWarmUpClass = 'bespoke-marp-transition-warming-up' as const

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
)
const reducedMotionOutgoingKeyframes =
  '__bespoke_marp_transition_reduced_outgoing__' as const

const reducedMotionIncomingKeyframes =
  '__bespoke_marp_transition_reduced_incoming__' as const

const reducedKeyframes: MarpTransitionKeyframes = {
  forward: {
    both: undefined,
    incoming: { name: reducedMotionIncomingKeyframes },
    outgoing: { name: reducedMotionOutgoingKeyframes },
  },
  backward: {
    both: undefined,
    incoming: { name: reducedMotionIncomingKeyframes },
    outgoing: { name: reducedMotionOutgoingKeyframes },
  },
}

const bespokeTransition = (deck) => {
  const createDocumentTransition: any = document['createDocumentTransition']
  if (!createDocumentTransition) return

  const transitionDuringState = (
    value?: boolean | DocumentTransition
  ): boolean | DocumentTransition | undefined => {
    if (value !== undefined) deck[transitionDuring] = value
    return deck[transitionDuring]
  }

  let currentFragment: any

  transitionDuringState(false)

  const doTransition = (
    transition: DocumentTransition | true, // true means no transition
    callback: () => void | Promise<void>
  ) => {
    requestAnimationFrame(async () => {
      transitionDuringState(transition)

      try {
        await callback()
      } catch (e) {
        console.warn(e)
      } finally {
        transitionDuringState(false)
      }
    })
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
            transitionData?.builtinFallback
              ? `__builtin__${transitionData.name}`
              : undefined,
          ]
        })
        .filter((v): v is string => !!v)
    )
  ).then(() => {
    // Workaround for Chrome's animation jank: Disable duration variables in keyframes after prefetch
    document.querySelectorAll<HTMLStyleElement>('style').forEach((style) => {
      style.innerHTML = style.innerHTML.replace(
        /--marp-transition-duration:[^;}]*[;}]/g,
        (matched) => matched.slice(0, -1) + '!important' + matched.slice(-1)
      )
    })
  })

  const transitionCallback =
    (fn: (e: any) => void, { back, cond }: TransitionCallbackOption) =>
    (e: any) => {
      const currentTransition = transitionDuringState()

      if (currentTransition) {
        if (e[transitionApply]) return true
        if (typeof currentTransition === 'object') {
          currentTransition.abandon()
          if (e.forSync) return true
        }
        return false
      }

      // Check condition
      // (The conditional function may modify event object so should be called at first of checks)
      if (!cond(e)) return true

      // Check transition
      const current = deck.slides[deck.slide()]
      const isBack = () => e.back ?? back
      const transitionDataTarget = `data-transition${isBack() ? '-back' : ''}`
      const section: HTMLElement = current.querySelector(
        `section[${transitionDataTarget}]`
      )
      if (!section) return true

      // Parse settings
      const transitionData = parseTransitionData(
        section.getAttribute(transitionDataTarget) ?? undefined
      )
      if (!transitionData) return true

      getMarpTransitionKeyframes(transitionData.name, {
        builtinFallback: transitionData.builtinFallback,
      }).then((keyframes) => {
        if (!keyframes) return doTransition(true, () => fn(e))

        // Normalize keyframes for preferred reduced motion
        let normalizedKeyframes = keyframes

        if (prefersReducedMotion.matches) {
          console.warn(
            'Use a constant animation to transition because preferring reduced motion by viewer has detected. '
          )
          normalizedKeyframes = reducedKeyframes
        }

        // Clean up (A previous style may be remaining if navigated by anchor link)
        const existStyle = document.getElementById(transitionStyleId)
        if (existStyle) existStyle.remove()

        // Set style for transition effect
        const style = document.createElement('style')
        style.id = transitionStyleId

        document.head.appendChild(style)

        resolveAnimationStyles(normalizedKeyframes, {
          backward: isBack(),
          duration: transitionData.duration,
        }).forEach((styleText) => style.sheet?.insertRule(styleText))

        try {
          // Start transition
          const transition: DocumentTransition =
            document['createDocumentTransition']()

          const rootClassList = document.documentElement.classList
          rootClassList.add(transitionWarmUpClass)

          let navigated = false

          const navigate = () => {
            if (navigated) return

            fn(e)
            navigated = true

            rootClassList.remove(transitionWarmUpClass)
          }

          doTransition(transition, async () => {
            try {
              await transition.start(navigate)
            } catch (err) {
              console.error(err)
              navigate()
            } finally {
              style.remove()
              rootClassList.remove(transitionWarmUpClass)
            }
          })
        } catch (e) {
          transitionDuringState(false)
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
