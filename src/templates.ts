import { compileTemplate } from 'pug'
import barePug from './templates/bare.pug'
import bareScss from './templates/bare.scss'

export const bare: compileTemplate = locals =>
  barePug({
    ...(locals || {}),
    bare: { css: bareScss },
  })

const templates: { [name: string]: compileTemplate } = { bare }

export default templates
