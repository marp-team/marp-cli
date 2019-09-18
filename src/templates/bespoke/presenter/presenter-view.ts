export default function presenterView(deck) {
  // Update title
  const { title } = document
  document.title = `[Presenter view]${title ? ` - ${title}` : ''}`

  // Build presenter view
  const container = buildContainer(deck.parent)

  container.appendChild(buildNext(deck))
  container.appendChild(buildPresenterNote(deck))

  const info = buildInfoContainer()

  info.appendChild(buildInfoPage(deck))
  container.appendChild(info)

  document.body.appendChild(container)
}

/** Build container element for presenter view. */
function buildContainer(deckElement: HTMLElement): HTMLElement {
  const container = document.createElement('div')

  container.className = 'bespoke-marp-presenter-container'
  container.appendChild(deckElement)

  return container
}

/** Build container element for informations */
function buildInfoContainer(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'bespoke-marp-presenter-info-container'

  return container
}

/** Build element to show current page and total page numbers. */
function buildInfoPage(deck): HTMLElement {
  const page = document.createElement('div')
  page.className = 'bespoke-marp-presenter-info-page'

  deck.on('activate', ({ index }) => {
    page.textContent = `${index + 1} / ${deck.slides.length}`
  })

  return page
}

/** Build next slide view. */
function buildNext(deck): HTMLElement {
  const container = document.createElement('div')
  container.className = 'bespoke-marp-presenter-next-container'
  container.addEventListener('click', () => deck.next())

  // IFrame for next view
  const next = document.createElement('iframe')
  const nav = createNavigateFunc(next)

  next.addEventListener('load', () => {
    container.classList.add('active')

    // Navigate slide
    nav(deck.slide(), deck.fragmentIndex)

    deck.on('fragment', ({ index, fragmentIndex }) => nav(index, fragmentIndex))
  })

  next.className = 'bespoke-marp-presenter-next'
  next.src = '?view=next'

  container.appendChild(next)

  return container
}

/** Build container element for presenter note with tracking an active note. */
function buildPresenterNote(deck) {
  const notes = document.querySelectorAll<HTMLElement>('.bespoke-marp-note')
  const container = document.createElement('div')

  container.className = 'bespoke-marp-presenter-note-container'

  notes.forEach(note => {
    note.addEventListener('keydown', e => e.stopPropagation())
    container.appendChild(note)
  })

  // Truck active note
  deck.on('activate', () => {
    notes.forEach(
      note =>
        note.classList.toggle('active', note.dataset.index == deck.slide()) // tslint:disable-line: triple-equals
    )
  })

  return container
}

/** Create function to send message to iframe for navigation */
function createNavigateFunc(iframe: HTMLIFrameElement) {
  return (index: number, fragmentIndex: number) =>
    iframe.contentWindow!.postMessage(
      `navigate:${index},${fragmentIndex}`,
      window.origin === 'null' ? '*' : window.origin
    )
}
