import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import {
  isTransitionData,
  type MarpTransitionData,
} from '../templates/bespoke/utils/transition'

import clockwise from './transition/keyframes/clockwise.scss'
import counterclockwise from './transition/keyframes/counterclockwise.scss'
import cover from './transition/keyframes/cover.scss'
import coverflow from './transition/keyframes/coverflow.scss'
import cube from './transition/keyframes/cube.scss'
import cylinder from './transition/keyframes/cylinder.scss'
import diamond from './transition/keyframes/diamond.scss'
import drop from './transition/keyframes/drop.scss'
import explode from './transition/keyframes/explode.scss'
import fadeOut from './transition/keyframes/fade-out.scss'
import fade from './transition/keyframes/fade.scss'
import fall from './transition/keyframes/fall.scss'
import flip from './transition/keyframes/flip.scss'
import glow from './transition/keyframes/glow.scss'
import implode from './transition/keyframes/implode.scss'
import inOut from './transition/keyframes/in-out.scss'
import irisIn from './transition/keyframes/iris-in.scss'
import irisOut from './transition/keyframes/iris-out.scss'
import melt from './transition/keyframes/melt.scss'
import overlap from './transition/keyframes/overlap.scss'
import pivot from './transition/keyframes/pivot.scss'
import pull from './transition/keyframes/pull.scss'
import push from './transition/keyframes/push.scss'
import reveal from './transition/keyframes/reveal.scss'
import rotate from './transition/keyframes/rotate.scss'
import slide from './transition/keyframes/slide.scss'
import star from './transition/keyframes/star.scss'
import swap from './transition/keyframes/swap.scss'
import swipe from './transition/keyframes/swipe.scss'
import swoosh from './transition/keyframes/swoosh.scss'
import wipe from './transition/keyframes/wipe.scss'
import wiper from './transition/keyframes/wiper.scss'
import zoom from './transition/keyframes/zoom.scss'

export const engineTransition = Symbol()

export interface EngineTransition {
  builtinTransitionStyle: string
}

interface TransitionMeta {
  transition?: MarpTransitionData
}

const builtinTransitions = {
  clockwise,
  counterclockwise,
  cover,
  coverflow,
  cube,
  cylinder,
  diamond,
  drop,
  explode,
  fade,
  'fade-out': fadeOut,
  fall,
  flip,
  glow,
  implode,
  'in-out': inOut,
  'iris-in': irisIn,
  'iris-out': irisOut,
  melt,
  overlap,
  pivot,
  pull,
  push,
  reveal,
  rotate,
  slide,
  star,
  swap,
  swipe,
  swoosh,
  wipe,
  wiper,
  zoom,

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

      let previousTransitionBack: string | undefined

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        // Apply stored transition for backward direction in the next slide of defined slide
        if (token.type === 'marpit_slide_open' && previousTransitionBack) {
          token.attrSet('data-transition-back', previousTransitionBack)
          previousTransitionBack = undefined
        }

        if (typeof marpitDirectives?.transition === 'object') {
          const transition = { ...marpitDirectives.transition }

          if (isTransitionData(transition)) {
            if (builtinTransitions[transition.name]) {
              builtinTransitionStyles.set(
                transition.name,
                builtinTransitions[transition.name]
              )
              transition.builtinFallback = true
            }

            const json = JSON.stringify(transition)
            token.attrSet('data-transition', json)

            previousTransitionBack = json
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
