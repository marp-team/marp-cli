import { MarpitOptions, MarpitRenderResult, Element } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'

export interface TemplateOptions {
  base?: string
  lang: string
  notifyWS?: string
  readyScript?: string
  renderer: (tplOpts: MarpitOptions) => TemplateRenderResult
  [prop: string]: any
}

export interface TemplateResult {
  rendered: TemplateRenderResult
  result: string
}

export interface TemplateRenderResult extends MarpitRenderResult {
  theme?: string
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
      watchJs: await watchJs(opts.notifyWS),
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
      bespoke: {
        css: bespokeScss,
        js: await libJs('bespoke.js'),
        progress: false,
      },
      watchJs: await watchJs(opts.notifyWS),
    }),
  }
}

export function libJs(fn: string) {
  return new Promise<string>((resolve, reject) =>
    fs.readFile(
      path.resolve(__dirname, fn), // __dirname is "lib" after bundle
      (e, data) => (e ? reject(e) : resolve(data.toString()))
    )
  )
}

export async function watchJs(notifyWS?: string) {
  if (notifyWS === undefined) return false

  const watchJs = await libJs('watch.js')
  return `window.__marpCliWatchWS=${JSON.stringify(notifyWS)};${watchJs}`
}

const templates: { [name: string]: Template } = { bare, bespoke }

export default templates
