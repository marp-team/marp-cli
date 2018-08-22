import barePug from './templates/bare.pug'
import bareScss from './templates/bare.scss'
import { MarpitOptions, MarpitRenderResult } from '@marp-team/marpit'

export interface TemplateOptions {
  renderer: (tplOpts: MarpitOptions) => MarpitRenderResult
  [prop: string]: any
}

export interface TemplateResult {
  options: TemplateOptions
  rendered: MarpitRenderResult
  result: string
}

export type Template = (locals: TemplateOptions) => TemplateResult

const render = (locals: TemplateOptions) =>
  new locals.engine(locals.options).render(locals.markdown)

export const bare: Template = opts => {
  const rendered = opts.renderer({
    container: [],
    inlineSVG: true,
    slideContainer: [],
  })

  const result = barePug({
    ...opts,
    ...rendered,
    bare: { css: bareScss },
  })

  return { rendered, result, options: opts }
}

const templates: { [name: string]: Template } = { bare }

export default templates
