declare module '*.png' {
  const png: string
  export default png
}

declare module '*.pug' {
  import { compileTemplate } from 'pug'

  const pug: compileTemplate
  export default pug
}

declare module '*.scss' {
  const scss: string
  export default scss
}

declare module 'puppeteer-core' {
  // eslint-disable-next-line import/no-unresolved
  import * as puppeteer from 'puppeteer'
  export = puppeteer
}
