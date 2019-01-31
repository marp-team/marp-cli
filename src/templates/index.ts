import { MarpitOptions, MarpitRenderResult, Element } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import barePug from './bare/bare.pug'
import bareScss from './bare/bare.scss'
import bespokePug from './bespoke/bespoke.pug'
import bespokeScss from './bespoke/bespoke.scss'

const readFile = promisify(fs.readFile)

interface TemplateCoreOption {
  base?: string
  lang: string
  notifyWS?: string
  readyScript?: string
  renderer: (
    tplOpts: MarpitOptions
  ) => MarpitRenderResult & TemplateExtraRenderResult
}

interface TemplateExtraRenderResult {
  title: string | undefined
  description: string | undefined
}

export type TemplateOption = TemplateBareOption | TemplateBespokeOption

interface TemplateBareOption {}

interface TemplateBespokeOption {
  osc?: boolean
  progress?: boolean
}

export interface TemplateResult {
  rendered: MarpitRenderResult
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
        osc: opts.osc === undefined ? true : opts.osc,
        progress: opts.progress,
      },
      readyScript:
        opts.readyScript ||
        `<script>${await libJs(
          require.resolve(
            '@marp-team/marpit-svg-polyfill/lib/polyfill.browser.js'
          )
        )}</script>`,
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
