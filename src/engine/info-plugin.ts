export interface EngineInfo {
  theme: string | undefined
  description: string | undefined
  image: string | undefined
  length: number
  size: { height: number; width: number }
  title: string | undefined
  url: string | undefined
}

export const engineInfo = Symbol()

export default function infoPlugin(md: any) {
  const { marpit } = md

  md.core.ruler.push('marp_cli_info', (state) => {
    if (state.inlineMode) return

    const { themeSet, lastGlobalDirectives } = marpit
    const globalDirectives = lastGlobalDirectives || {}
    const theme = globalDirectives.theme || (themeSet.default || {}).name

    const info: EngineInfo = {
      theme,
      description: globalDirectives.marpCLIDescription,
      image: globalDirectives.marpCLIImage,
      title: globalDirectives.marpCLITitle,
      url: globalDirectives.marpCLIURL,
      size: {
        height: themeSet.getThemeProp(theme!, 'heightPixel'),
        width: themeSet.getThemeProp(theme!, 'widthPixel'),
      },
      length: 0,
    }

    for (const token of state.tokens) {
      if (token.meta?.marpitSlideElement === 1) info.length += 1
    }

    marpit[engineInfo] = info
  })
}
