import { MarpitOptions, MarpitRenderResult, Element } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'

const readFile = promisify(fs.readFile)

type RendererResult = MarpitRenderResult &
  TemplateMeta & {
    length: number
    size: RenderedSize
  }

interface TemplateCoreOption {
  base?: string
  lang: string
  notifyWS?: string
  renderer: (tplOpts: MarpitOptions) => RendererResult
}

export interface TemplateMeta {
  description: string | undefined
  image: string | undefined
  title: string | undefined
  url: string | undefined
}

interface RenderedSize {
  height: number
  width: number
}

export type TemplateOption = TemplateBareOption | TemplateBespokeOption

interface TemplateBareOption {}

interface TemplateBespokeOption {
  osc?: boolean
  progress?: boolean
}

export interface TemplateResult {
  rendered: RendererResult
  result: string
}

export type Template<T = TemplateOption> = (
  locals: TemplateCoreOption & T
) => Promise<TemplateResult>

export const bare: Template<TemplateBareOption> = async opts => {
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

export const bespoke: Template<TemplateBespokeOption> = async opts => {
  const rendered = opts.renderer({
    container: new Element('div', { id: 'p' }),
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
        osc: opts.osc ?? true,
        progress: opts.progress,
      },
      watchJs: await watchJs(opts.notifyWS),
    }),
  }
}

async function libJs(fn: string) {
  return (await readFile(path.resolve(__dirname, fn))).toString()
}

async function watchJs(notifyWS?: string) {
  if (notifyWS === undefined) return false

  const watchJs = await libJs('watch.js')
  return `window.__marpCliWatchWS=${JSON.stringify(notifyWS)};${watchJs}`
}

export default { bare, bespoke }
