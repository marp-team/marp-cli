// Based on https://github.com/bespokejs/bespoke-progress
const query = '.bespoke-progress-parent > .bespoke-progress-bar'

const basepokeProgress = (deck) => {
  deck.on('activate', (e) => {
    document.querySelectorAll<HTMLElement>(query).forEach((bar) => {
      bar.style.flexBasis = `${(e.index * 100) / (deck.slides.length - 1)}%`
    })
  })
}

export default basepokeProgress
