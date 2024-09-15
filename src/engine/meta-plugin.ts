import { URL } from 'url'
import { Marpit } from '@marp-team/marpit'
import { warn } from '../cli'

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

export default function metaPlugin({ marpit }: { marpit: Marpit }) {
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
      // URL validation
      try {
        if (v) new URL(v)
      } catch {
        warn(`Specified canonical URL is ignored since invalid URL: ${v}`)
        return {}
      }

      return { marpCLIURL: v }
    },
  })

  // TODO: Add rule to fill meta from content of slide deck when directives are not defined.
}
