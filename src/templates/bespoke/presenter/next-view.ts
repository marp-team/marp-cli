export default function nextView(deck) {
  // Listen "navigate" message from parent
  const listener = (e: MessageEvent) => {
    if (e.origin !== window.origin) return

    const [dir, args] = e.data.split(':')

    if (dir === 'navigate') {
      const [sIdx, sFragIdx] = args.split(',')
      let idx = Number.parseInt(sIdx, 10)
      let fragment = Number.parseInt(sFragIdx, 10) + 1

      if (fragment >= deck.fragments[idx].length) {
        idx += 1
        fragment = 0
      }

      deck.slide(idx, { fragment })
    }
  }

  window.addEventListener('message', listener)
}
