import { Marpit } from '@marp-team/marpit'

export default function metaPlugin(_, marpit: Marpit) {
  marpit.customDirectives.global.title = v => ({ marpCLITitle: v })
  marpit.customDirectives.global.description = v => ({ marpCLIDescription: v })

  // TODO: Add rule to fill meta from content of slide deck when directives are not defined.
}
