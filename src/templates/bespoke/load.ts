import { dataAttrPrefix } from './utils'

const bespokeLoad = (deck) => {
  window.addEventListener('load', () => {
    for (const slide of deck.slides) {
      // Slides contained Marp Core's fitting elements must not hide via `display: none;`.
      // https://github.com/marp-team/marp-cli/issues/153
      //
      // NOTE: [data-marp-fitting] is used by Marp Core v2
      const hasFittingElement = slide.querySelector(
        'marp-auto-scaling, [data-auto-scaling], [data-marp-fitting]'
      )

      slide.setAttribute(
        `${dataAttrPrefix}load`,
        hasFittingElement ? '' : 'hideable'
      )
    }
  })
}

export default bespokeLoad
