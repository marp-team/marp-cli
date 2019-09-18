export default function nextView(deck) {
  // Listen "navigate" message from parent
  window.addEventListener('message', e => {
    if (e.origin !== window.origin) return

    const [dir, args] = e.data.split(':')

    if (dir === 'navigate') {
      const [idx, fragIdx] = args.split(',')

      deck.slide(Number.parseInt(idx, 10), {
        fragment: Number.parseInt(fragIdx, 10),
      })
      deck.next()
    }
  })
}
