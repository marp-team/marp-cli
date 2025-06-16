import { URL } from 'node:url'
import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import { warn } from '../cli'
import { debug } from '../utils/debug'

type Token = ReturnType<MarkdownIt['parse']>[number]

export const keywordsAsArray = (keywords: unknown): string[] | undefined => {
  let kws: any[] | undefined

  if (Array.isArray(keywords)) {
    kws = keywords
  } else if (typeof keywords === 'string') {
    kws = keywords.split(',').map((s) => s.trim())
  }

  if (kws) {
    const filtered = [
      ...new Set(
        kws.filter(
          (kw: unknown): kw is string => typeof kw === 'string' && !!kw
        )
      ).values(),
    ]

    if (filtered.length > 0) return filtered
  }

  return undefined
}

export const detectTitle = (tokens: Token[]): string | undefined => {
  let bestHeading: { level: number; content?: string } = {
    level: Number.MAX_SAFE_INTEGER,
  }

  const { length } = tokens

  for (let i = 0; i < length; i += 1) {
    const token = tokens[i]

    if (token.type === 'heading_open' && !token.hidden) {
      const tagMatcher = token.tag.match(/^h([1-6])$/i)

      if (tagMatcher) {
        const level = parseInt(tagMatcher[1], 10)
        const likelyContentToken = tokens[i + 1]

        if (
          likelyContentToken &&
          likelyContentToken.type === 'inline' &&
          level < bestHeading.level
        ) {
          // TODO: Use the content of renderInline() as a title
          bestHeading = { level, content: likelyContentToken.content.trim() }
        }
      }
    }
  }

  return bestHeading.content
}

export default function metaPlugin(md: MarkdownIt & { marpit: Marpit }) {
  const { marpit } = md

  Object.assign(marpit.customDirectives.global, {
    author: (v) => (typeof v === 'string' ? { marpCLIAuthor: v } : {}),
    description: (v) =>
      typeof v === 'string' ? { marpCLIDescription: v } : {},
    image: (v) => (typeof v === 'string' ? { marpCLIImage: v } : {}),
    keywords: (v) => {
      const marpCLIKeywords = keywordsAsArray(v)
      return marpCLIKeywords ? { marpCLIKeywords } : {}
    },
    title: (v) => (typeof v === 'string' ? { marpCLITitle: v } : {}),
    url: (v) => {
      if (Array.isArray(v)) return {}

      // URL validation
      try {
        if (v) new URL(v)
      } catch {
        warn(`Specified canonical URL is ignored since invalid URL: ${v}`)
        return {}
      }

      return { marpCLIURL: v ?? undefined }
    },
  })

  md.core.ruler.after(
    'marpit_directives_global_parse',
    'marp_cli_meta_title_detection',
    (state) => {
      if (state.inlineMode) return false

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Assign title global directive into protected property to allow reading title from other injected plugins.
      const { lastGlobalDirectives } = (
        state.md as MarkdownIt & { marpit: Marpit }
      ).marpit

      if (lastGlobalDirectives && !('marpCLITitle' in lastGlobalDirectives)) {
        debug(
          'Markdown parser had detected no title setting. Marp CLI will try to extract title from headings in Markdown contents.'
        )

        const detectedTitle = detectTitle(state.tokens)

        if (detectedTitle) {
          lastGlobalDirectives.marpCLITitle = detectedTitle
          debug(`Title detected: "${detectedTitle}"`)
        } else {
          debug('No title was detected from headings.')
        }
      }
    }
  )
}
