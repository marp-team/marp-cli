import keys from 'bespoke-keys'

export default function bespokeKeys(deck) {
  keys()(deck)

  document.addEventListener('keydown', e => {
    if (e.which === 35) deck.slide(deck.slides.length - 1) // End
    if (e.which === 36) deck.slide(0) // Home
    if (e.which === 38) deck.prev() // UP
    if (e.which === 40) deck.next() // DOWN
  })
}
