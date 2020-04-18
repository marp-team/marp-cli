import { Marpit } from '@marp-team/marpit'
import { URL } from 'url'
import { warn } from '../cli'

export default function metaPlugin({ marpit }: { marpit: Marpit }) {
  Object.assign(marpit.customDirectives.global, {
    description: (v) =>
      typeof v === 'string' ? { marpCLIDescription: v } : {},
    image: (v) => (typeof v === 'string' ? { marpCLIImage: v } : {}),
    title: (v) => (typeof v === 'string' ? { marpCLITitle: v } : {}),
    url: (v) => {
      // URL validation
      try {
        if (v) new URL(v)
      } catch (e) {
        warn(`Specified canonical URL is ignored since invalid URL: ${v}`)
        return {}
      }

      return { marpCLIURL: v }
    },
  })

  // TODO: Add rule to fill meta from content of slide deck when directives are not defined.
}
