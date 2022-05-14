import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import {
  isTransitionData,
  type MarpTransitionData,
} from '../templates/bespoke/utils/transition'

import cover from './transition/keyframes/cover.scss'
import cube from './transition/keyframes/cube.scss'
import drop from './transition/keyframes/drop.scss'
import explode from './transition/keyframes/explode.scss'
import fadeOut from './transition/keyframes/fade-out.scss'
import fade from './transition/keyframes/fade.scss'
import flip from './transition/keyframes/flip.scss'
import grow from './transition/keyframes/grow.scss'
import implode from './transition/keyframes/implode.scss'
import inOut from './transition/keyframes/in-out.scss'
import irisIn from './transition/keyframes/iris-in.scss'
import irisOut from './transition/keyframes/iris-out.scss'
import pivot from './transition/keyframes/pivot.scss'
import pull from './transition/keyframes/pull.scss'
import push from './transition/keyframes/push.scss'
import reveal from './transition/keyframes/reveal.scss'
import slide from './transition/keyframes/slide.scss'
import star from './transition/keyframes/star.scss'
import swap from './transition/keyframes/swap.scss'
import wipe from './transition/keyframes/wipe.scss'

export const engineTransition = Symbol()

export interface EngineTransition {
  builtinTransitionStyle: string
}

interface TransitionMeta {
  transition?: MarpTransitionData
}

const builtinTransitions = {
  cover,
  cube,
  drop,
  explode,
  fade,
  'fade-out': fadeOut,
  flip,
  grow,
  implode,
  'in-out': inOut,
  'iris-in': irisIn,
  'iris-out': irisOut,
  pivot,
  pull,
  push,
  reveal,
  slide,
  star,
  swap,
  wipe,

  // Reserved transition to disable
  none: false,
} as const

export default function transitionPlugin(md: MarkdownIt & { marpit: Marpit }) {
  const { marpit } = md

  marpit.customDirectives.local.transition = (value): TransitionMeta => {
    if (typeof value === 'string') {
      const [name, duration] = value.trim().split(/\s+/)
      const transition = { name, duration }

      if (isTransitionData(transition)) return { transition }
    }
    return {}
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_transition',
    (state) => {
      if (state.inlineMode) return false

      const builtinTransitionStyles = new Map<string, string>()

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (typeof marpitDirectives?.transition === 'object') {
          const transition = { ...marpitDirectives.transition }

          if (isTransitionData(transition)) {
            if (builtinTransitions[transition.name] !== undefined) {
              builtinTransitionStyles.set(
                transition.name,
                builtinTransitions[transition.name]
              )
              transition.bultinFallback = true
            }

            const json = JSON.stringify(transition)

            token.attrSet('data-transition', json)
            token.attrSet('data-transition-back', json)
          }
        }
      }

      const transitionEngineInfo: EngineTransition = {
        builtinTransitionStyle: [...builtinTransitionStyles.values()].join(''),
      }

      marpit[engineTransition] = transitionEngineInfo

      return true
    }
  )
}
