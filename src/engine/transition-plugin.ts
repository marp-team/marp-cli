import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import { warn } from '../cli'

const hasOwnProperty = Object.prototype.hasOwnProperty

interface TransitionMetaConfig {
  type: keyof typeof transitions
  duration?: number
  delay?: number
}

interface TransitionMeta {
  transition?: TransitionMetaConfig
  transitionBack?: TransitionMetaConfig
}

const inverted = {
  'reveal-left': 'reveal-right',
  'reveal-right': 'reveal-left',
  'reveal-up': 'reveal-down',
  'reveal-down': 'reveal-up',
  'cover-left': 'cover-right',
  'cover-right': 'cover-left',
  'cover-up': 'cover-down',
  'cover-down': 'cover-up',
  fade: 'fade',
  explode: 'implode',
  implode: 'explode',
} as const

const transitions = {
  reveal: 'reveal-left',
  'reveal-left': 'reveal-left',
  'reveal-right': 'reveal-right',
  'reveal-up': 'reveal-up',
  'reveal-down': 'reveal-down',
  cover: 'cover-left',
  'cover-left': 'cover-left',
  'cover-right': 'cover-right',
  'cover-up': 'cover-up',
  'cover-down': 'cover-down',
  fade: 'fade',
  explode: 'implode',
  implode: 'explode',
} as const

const asTransitionLength = (target: string, value: number) => {
  const integer = Math.floor(value)
  const clamped = Math.max(0, Math.min(5000, integer))

  if (integer !== clamped) {
    warn(
      `The length of ${target} must be between 0 to 5000ms. ${integer}ms is clamped to ${clamped}ms.`
    )
  }

  return clamped
}

const parseMs = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return Number.NaN

  const normalized = value.trim()

  const msUnitMatcher = normalized.match(/^(-?\d+)ms$/)
  if (msUnitMatcher) return Number.parseInt(msUnitMatcher[1], 10)

  const secondUnitMatcher = normalized.match(/^(-?(?:\d*\.)?\d+)s$/)
  if (secondUnitMatcher) return Number.parseFloat(secondUnitMatcher[1]) * 1000

  return Number.parseFloat(normalized)
}

const parseTransitionMetaConfig = (
  value: unknown
): TransitionMetaConfig | undefined => {
  if (typeof value === 'string') {
    const transition = transitions[value]
    if (transition) return { type: transition }
  } else if (value && typeof value === 'object') {
    const obj = value as TransitionMetaConfig
    const transition = transitions[obj.type]

    if (transition) {
      const ret: TransitionMetaConfig = { type: transition }

      const duration = parseMs(obj.duration)
      if (!Number.isNaN(duration)) {
        ret.duration = asTransitionLength('duration', duration)
      }

      const delay = parseMs(obj.delay)
      if (!Number.isNaN(delay)) ret.delay = asTransitionLength('delay', delay)

      return ret
    }
  }
  return undefined
}

export default function transitionPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.transition = (value): TransitionMeta => {
    if (typeof value === 'string' || (value && typeof value === 'object')) {
      const transition = parseTransitionMetaConfig(value)

      if (transition) {
        const transitionBackType = inverted[transition.type]

        return {
          transition,
          ...(transitionBackType
            ? { transitionBack: { ...transition, type: transitionBackType } }
            : {}),
        }
      } else {
        return { transition: undefined, transitionBack: undefined }
      }
    }

    return {}
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_transition',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.transition) {
          const { transition } = marpitDirectives
          token.attrSet(`data-transition`, transition.type)

          if (hasOwnProperty.call(transition, 'duration')) {
            token.attrSet(`data-transition-duration`, transition.duration)
          }
          if (hasOwnProperty.call(transition, 'delay')) {
            token.attrSet(`data-transition-delay`, transition.delay)
          }
        }
        if (marpitDirectives?.transitionBack) {
          const { transitionBack } = marpitDirectives
          token.attrSet(`data-transition-back`, transitionBack.type)

          if (hasOwnProperty.call(transitionBack, 'duration')) {
            token.attrSet(
              `data-transition-back-duration`,
              transitionBack.duration
            )
          }
          if (hasOwnProperty.call(transitionBack, 'delay')) {
            token.attrSet(`data-transition-back-delay`, transitionBack.delay)
          }
        }
      }

      return true
    }
  )
}
