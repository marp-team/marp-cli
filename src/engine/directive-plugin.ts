export const generateOverrideGlobalDirectivesPlugin = (
  directives: Record<string, any>
) => {
  return function overrideGlobalDirectivesPlugin(md: any) {
    md.core.ruler.after(
      'inline',
      'marp_cli_override_global_directives',
      (state) => {
        if (state.inlineMode) return

        for (const [key, value] of Object.entries(directives)) {
          if (value !== undefined) {
            const kv = `${key}: ${value}`
            const marpitCommentToken = new state.Token('marpit_comment', '', 0)

            marpitCommentToken.hidden = true
            marpitCommentToken.content = kv
            marpitCommentToken.markup = `<!-- ${kv} -->`
            marpitCommentToken.meta = {
              marpitParsedDirectives: { [key]: value },
              marpitCommentParsed: 'marp-cli-overridden-global-directives',
            }

            state.tokens.push(marpitCommentToken)
          }
        }
      }
    )
  }
}
