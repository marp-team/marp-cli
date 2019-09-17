export default function bespokeLoad(deck) {
  window.addEventListener('load', () => {
    for (const slide of deck.slides) {
      // Slides contained Marp Core's fitting elements must not hide via `display: none;`.
      // https://github.com/marp-team/marp-cli/issues/153
      const type = slide.querySelector('[data-marp-fitting]') ? '' : 'hideable'

      slide.setAttribute('data-bespoke-marp-load', type)
    }
  })
}
