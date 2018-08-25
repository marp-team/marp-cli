import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import { MarpitOptions, MarpitRenderResult } from '@marp-team/marpit'

export interface TemplateOptions {
  lang: string
  readyScript?: string
  renderer: (tplOpts: MarpitOptions) => MarpitRenderResult
  [prop: string]: any
}

export interface TemplateResult {
  rendered: MarpitRenderResult
  result: string
}

export type Template = (locals: TemplateOptions) => Promise<TemplateResult>

export const bare: Template = async opts => {
  const rendered = opts.renderer({
    container: [],
    inlineSVG: true,
    slideContainer: [],
  })

  return {
    rendered,
    result: barePug({
      ...opts,
      ...rendered,
      bare: { css: bareScss },
    }),
  }
}

const templates: { [name: string]: Template } = { bare }

export default templates
