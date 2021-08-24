import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

const inverted = {
  'reveal-left': 'reveal-right',
  'reveal-right': 'reveal-left',
  'reveal-up': 'reveal-down',
  'reveal-down': 'reveal-up',
  'cover-left': 'cover-right',
  'cover-right': 'cover-left',
  'cover-up': 'cover-down',
  'cover-down': 'cover-up',
  explode: 'implode',
  implode: 'explode',
}

const transitions: Record<string, string> = {
  ...Object.keys(inverted).reduce<Record<string, string>>(
    (acc, transition) => ({ ...acc, [transition]: transition }),
    {}
  ),
  reveal: 'reveal-left',
  cover: 'cover-left',
}

export default function transitionPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.transition = (value) => {
    if (typeof value !== 'string') return {}

    const transition = transitions[value]
    if (!transition) return { transition: undefined, transitionBack: undefined }

    const transitionBack: string | undefined = inverted[transition]
    return { transition, ...(transitionBack ? { transitionBack } : {}) }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_transition',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.transition) {
          token.attrSet(`data-transition`, marpitDirectives.transition)
        }
        if (marpitDirectives?.transitionBack) {
          token.attrSet(`data-transition-back`, marpitDirectives.transitionBack)
        }
      }

      return true
    }
  )
}
