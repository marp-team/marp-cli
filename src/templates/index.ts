import fs from 'fs'
import path from 'path'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'
import { MarpitOptions, MarpitRenderResult, Element } from '@marp-team/marpit'

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

export const bespoke: Template = async opts => {
  const rendered = opts.renderer({
    container: new Element('article', { id: 'presentation' }),
    inlineSVG: true,
    slideContainer: [],
  })

  return {
    rendered,
    result: bespokePug({
      ...opts,
      ...rendered,
      progress: false,
      bespoke: {
        css: bespokeScss,
        js: await bespokeJs(),
      },
    }),
  }
}

export function bespokeJs() {
  return new Promise<string>((resolve, reject) =>
    fs.readFile(
      path.resolve(__dirname, './bespoke.js'), // __dirname is "lib" after bundle
      (e, data) => (e ? reject(e) : resolve(data.toString()))
    )
  )
}

const templates: { [name: string]: Template } = { bare, bespoke }

export default templates
