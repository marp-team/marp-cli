export default function nextView(deck) {
  // Listen "navigate" message from parent
  const listener = (e: MessageEvent) => {
    if (e.origin !== window.origin) return

    const [dir, args] = e.data.split(':')

    if (dir === 'navigate') {
      const [idx, fragIdx] = args.split(',')

      deck.slide(Number.parseInt(idx, 10), {
        fragment: Number.parseInt(fragIdx, 10),
      })
      deck.next()
    }
  }

  window.addEventListener('message', listener)
  deck.on('destroy', () => window.removeEventListener('message', listener))
}
