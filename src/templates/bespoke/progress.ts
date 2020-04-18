// Based on https://github.com/bespokejs/bespoke-progress

// TODO: Revert to the detailed scope after upgrade JSDOM
// ".bespoke-progress-parent > .bespoke-progress-bar"
const query = '.bespoke-progress-bar'

export default function basepokeProgress(deck) {
  deck.on('activate', (e) => {
    document.querySelectorAll<HTMLElement>(query).forEach((bar) => {
      bar.style.flexBasis = `${(e.index * 100) / (deck.slides.length - 1)}%`
    })
  })
}
