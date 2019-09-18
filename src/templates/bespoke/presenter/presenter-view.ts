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
  info.appendChild(buildInfoTime())
  info.appendChild(buildInfoTimer())
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

  const text = document.createElement('span')
  text.className = 'bespoke-marp-presenter-info-page-text'

  deck.on('activate', ({ index }) => {
    text.textContent = `${index + 1} / ${deck.slides.length}`
  })

  const prev = document.createElement('button')
  prev.className = 'bespoke-marp-presenter-info-page-prev'
  prev.tabIndex = -1
  prev.textContent = 'Previous'
  prev.title = 'Previous'
  prev.addEventListener('click', () => {
    prev.blur()
    deck.prev()
  })

  const next = document.createElement('button')
  next.className = 'bespoke-marp-presenter-info-page-next'
  next.tabIndex = -1
  next.textContent = 'Next'
  next.title = 'Next'
  next.addEventListener('click', () => {
    next.blur()
    deck.next()
  })

  deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
    prev.disabled = index === 0 && fragmentIndex === 0
    next.disabled =
      index === deck.slides.length - 1 && fragmentIndex === fragments.length - 1
  })

  page.appendChild(prev)
  page.appendChild(text)
  page.appendChild(next)

  return page
}

/** Add element to show current time */
function buildInfoTime() {
  const time = document.createElement('time')

  time.title = 'Current time'
  time.className = 'bespoke-marp-presenter-info-time'

  const update = () => (time.textContent = new Date().toLocaleTimeString())

  update()
  setInterval(update, 250)

  return time
}

/** Add element to control timer */
function buildInfoTimer() {
  const container = document.createElement('div')
  container.className = 'bespoke-marp-presenter-info-timer'

  // TODO: Start timer
  container.textContent = 'Start timer'

  return container
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

  deck.on('activate', () =>
    notes.forEach(
      n => n.classList.toggle('active', n.dataset.index == deck.slide()) // tslint:disable-line: triple-equals
    )
  )

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
