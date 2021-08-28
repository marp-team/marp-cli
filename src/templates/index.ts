import fs from 'fs'
import path from 'path'
import { Element, Marpit, Options, RenderResult } from '@marp-team/marpit'
import transitionPlugin from '../engine/transition-plugin'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'

type RendererResult = RenderResult &
  TemplateMeta & {
    length: number
    size: RenderedSize
  }

interface TemplateRendererOptions extends Options {
  modifier?: (marpit: Marpit) => void
}

interface TemplateCoreOption {
  base?: string
  lang: string
  notifyWS?: string
  renderer: (tplOpts: TemplateRendererOptions) => RendererResult
}

export interface TemplateMeta {
  author: string | undefined
  description: string | undefined
  image: string | undefined
  keywords: string[] | undefined
  title: string | undefined
  url: string | undefined
}

interface RenderedSize {
  height: number
  width: number
}

export type TemplateOption = TemplateBareOption | TemplateBespokeOption

interface TemplateBareOption {} // eslint-disable-line @typescript-eslint/no-empty-interface

interface TemplateBespokeOption {
  osc?: boolean
  progress?: boolean
  transition?: boolean
}

export interface TemplateResult {
  rendered: RendererResult
  result: string
}

export type Template<T = TemplateOption> = ((
  locals: TemplateCoreOption & T
) => Promise<TemplateResult>) & {
  printable?: boolean
}

export const bare: Template<TemplateBareOption> = async (opts) => {
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

Object.defineProperty(bare, 'printable', { value: true })

export const bespoke: Template<TemplateBespokeOption> = async (opts) => {
  const rendered = opts.renderer({
    container: new Element('div', { id: 'p' }),
    inlineSVG: true,
    slideContainer: [],
    modifier: (marpit) => {
      if (opts.transition) marpit.use(transitionPlugin)
    },
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

// Sometimes bespoke template cannot render background images since Chrome 85
Object.defineProperty(bespoke, 'printable', { value: false })

async function libJs(fn: string) {
  return (await fs.promises.readFile(path.resolve(__dirname, fn))).toString()
}

async function watchJs(notifyWS?: string) {
  if (notifyWS === undefined) return false

  const watchJs = await libJs('watch.js')
  return `window.__marpCliWatchWS=${JSON.stringify(notifyWS)};${watchJs}`
}

export default { bare, bespoke }
