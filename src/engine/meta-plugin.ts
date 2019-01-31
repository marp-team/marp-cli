import { Marpit } from '@marp-team/marpit'

export default function metaPlugin(_, marpit: Marpit) {
  Object.assign(marpit.customDirectives.global, {
    description: v => ({ marpCLIDescription: v }),
    image: v => ({ marpCLIImage: v }),
    title: v => ({ marpCLITitle: v }),
    url: v => ({ marpCLIURL: v }),
  })

  // TODO: Add rule to fill meta from content of slide deck when directives are not defined.
}
