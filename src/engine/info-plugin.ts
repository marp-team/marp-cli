export interface EngineInfo {
  author: string | undefined
  description: string | undefined
  image: string | undefined
  keywords: string[] | undefined
  lang: string | undefined
  length: number
  size: { height: number; width: number }
  theme: string | undefined
  title: string | undefined
  url: string | undefined
}

export const engineInfo = Symbol()

/**
 * Extracts the title from the higher hierarchy heading in the Markdown tokens.
 * @param tokens - The list of Markdown tokens.
 * @returns The extracted title or undefined if no heading is found.
 */
function extractTitleFromFirstHeading(tokens: any[]): string | undefined {
  let bestHeading: { level: number; content: string } | undefined
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.slice(1), 10)
      const headingContentToken = tokens[i + 1]
      if (
        headingContentToken &&
        headingContentToken.type === 'inline' &&
        (!bestHeading || level < bestHeading.level)
      ) {
        bestHeading = { level, content: headingContentToken.content.trim() }
      }
    }
  }
  return bestHeading?.content
}

export default function infoPlugin(md: any) {
  const { marpit } = md

  md.core.ruler.push('marp_cli_info', (state) => {
    if (state.inlineMode) return

    const { themeSet, lastGlobalDirectives } = marpit
    const globalDirectives = lastGlobalDirectives || {}
    const theme = globalDirectives.theme || (themeSet.default || {}).name
    const title =
      globalDirectives.marpCLITitle ||
      extractTitleFromFirstHeading(state.tokens)

    const info: EngineInfo = {
      theme,
      author: globalDirectives.marpCLIAuthor,
      description: globalDirectives.marpCLIDescription,
      image: globalDirectives.marpCLIImage,
      keywords: globalDirectives.marpCLIKeywords,
      lang: globalDirectives.lang || marpit.options.lang,
      title,
      url: globalDirectives.marpCLIURL,
      size: {
        height: themeSet.getThemeProp(theme, 'heightPixel'),
        width: themeSet.getThemeProp(theme, 'widthPixel'),
      },
      length: 0,
    }

    for (const token of state.tokens) {
      if (token.meta?.marpitSlideElement === 1) info.length += 1
    }

    marpit[engineInfo] = info
  })
}
