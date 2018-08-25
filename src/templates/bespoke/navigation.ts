import keys from 'bespoke-keys'

export default function bespokeNavigation(deck) {
  keys()(deck)

  document.addEventListener('keydown', e => {
    if (e.which === 35) deck.slide(deck.slides.length - 1) // End
    if (e.which === 36) deck.slide(0) // Home
    if (e.which === 38) deck.prev() // UP
    if (e.which === 40) deck.next() // DOWN
  })

  document.addEventListener('wheel', e => {
    if (e.deltaX > 0 || e.deltaY > 0) deck.next()
    if (e.deltaX < 0 || e.deltaY < 0) deck.prev()
  })
}
