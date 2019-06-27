export interface EngineInfo {
  theme: string | undefined
  description: string | undefined
  image: string | undefined
  title: string | undefined
  url: string | undefined
  size: { height: number; width: number }
}

export const engineInfo = Symbol()

export default function infoPlugin(md: any) {
  const { marpit } = md

  md.core.ruler.push('marp_cli_info', state => {
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
    }

    marpit[engineInfo] = info
  })
}
