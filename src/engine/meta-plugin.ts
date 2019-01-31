import { Marpit } from '@marp-team/marpit'
import { URL } from 'url'
import { warn } from '../cli'

export default function metaPlugin(_, marpit: Marpit) {
  Object.assign(marpit.customDirectives.global, {
    description: v => ({ marpCLIDescription: v }),
    image: v => ({ marpCLIImage: v }),
    title: v => ({ marpCLITitle: v }),
    url: v => {
      // URL validation
      try {
        new URL(v)
      } catch (e) {
        warn(`Specified canonical URL is ignored since invalid URL: ${v}`)
        return {}
      }

      return { marpCLIURL: v }
    },
  })

  // TODO: Add rule to fill meta from content of slide deck when directives are not defined.
}
