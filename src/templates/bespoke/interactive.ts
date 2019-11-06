// Based on https://github.com/bespokejs/bespoke-forms

const interactiveNodes = [
  'AUDIO',
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
  'VIDEO',
]

export default function bespokeInteractive(deck) {
  ;(deck.parent as HTMLElement).addEventListener('keydown', e => {
    if (!e.target) return

    const element = e.target as HTMLElement

    if (
      interactiveNodes.includes(element.nodeName) ||
      element.contentEditable === 'true'
    )
      e.stopPropagation()
  })
}
