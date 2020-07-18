/** @jsx h */
import h from 'vhtml'

const Fragment: any = ({ children }) => h(null, null, ...children)

export const classes = {
  container: 'bespoke-marp-presenter-container',
  next: 'bespoke-marp-presenter-next',
  nextContainer: 'bespoke-marp-presenter-next-container',
  noteContainer: 'bespoke-marp-presenter-note-container',
  infoContainer: 'bespoke-marp-presenter-info-container',
  infoPage: 'bespoke-marp-presenter-info-page',
  infoPageText: 'bespoke-marp-presenter-info-page-text',
  infoPagePrev: 'bespoke-marp-presenter-info-page-prev',
  infoPageNext: 'bespoke-marp-presenter-info-page-next',
  infoTime: 'bespoke-marp-presenter-info-time',
  infoTimer: 'bespoke-marp-presenter-info-timer',
} as const

export default function presenterView(deck) {
  const { title } = document
  document.title = `[Presenter view]${title ? ` - ${title}` : ''}`

  // Setup template for presenter view
  const buildContainer = (deckElement: HTMLElement) => {
    const container = document.createElement('div')
    container.className = classes.container

    container.appendChild(deckElement)
    container.insertAdjacentHTML(
      'beforeend',
      <Fragment>
        <div class={classes.nextContainer}>
          <iframe class={classes.next} src="?view=next" />
        </div>
        <div class={classes.noteContainer}></div>
        <div class={classes.infoContainer}>
          <div class={classes.infoPage}>
            <button class={classes.infoPagePrev} tabindex="-1" title="Previous">
              Previous
            </button>
            <span class={classes.infoPageText}></span>
            <button class={classes.infoPageNext} tabindex="-1" title="Next">
              Next
            </button>
          </div>
          <time class={classes.infoTime} title="Current time"></time>
          <div class={classes.infoTimer}>{/* TODO: Implement timer */}</div>
        </div>
      </Fragment>
    )

    return container
  }

  const $cache: { -readonly [T in keyof typeof classes]?: HTMLElement } = {}
  const $ = (klass: typeof classes[keyof typeof classes]): HTMLElement => {
    $cache[klass] =
      $cache[klass] || document.querySelector<HTMLElement>(`.${klass}`)!

    return $cache[klass]
  }

  const subscribe = (deck) => {
    // Next slide view
    $(classes.nextContainer).addEventListener('click', () => deck.next())

    const nextIframe = $(classes.next) as HTMLIFrameElement
    const nextNav = createNavigateFunc(nextIframe)

    nextIframe.addEventListener('load', () => {
      $(classes.nextContainer).classList.add('active')

      // Navigate slide
      nextNav(deck.slide(), deck.fragmentIndex)

      deck.on('fragment', ({ index, fragmentIndex }) =>
        nextNav(index, fragmentIndex)
      )
    })

    // Presenter note
    const notes = document.querySelectorAll<HTMLElement>('.bespoke-marp-note')

    notes.forEach((note) => {
      note.addEventListener('keydown', (e) => e.stopPropagation())
      $(classes.noteContainer).appendChild(note)
    })

    deck.on('activate', () =>
      notes.forEach((n) =>
        n.classList.toggle('active', n.dataset.index == deck.slide())
      )
    )

    // Page info
    deck.on('activate', ({ index }) => {
      $(classes.infoPageText).textContent = `${index + 1} / ${
        deck.slides.length
      }`
    })

    const prev = $(classes.infoPagePrev) as HTMLButtonElement
    const next = $(classes.infoPageNext) as HTMLButtonElement

    prev.addEventListener('click', () => {
      prev.blur()
      deck.prev()
    })

    next.addEventListener('click', () => {
      next.blur()
      deck.next()
    })

    deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
      prev.disabled = index === 0 && fragmentIndex === 0
      next.disabled =
        index === deck.slides.length - 1 &&
        fragmentIndex === fragments.length - 1
    })

    // Current time
    const update = () =>
      ($(classes.infoTime).textContent = new Date().toLocaleTimeString())

    update()
    setInterval(update, 250)
  }

  document.body.appendChild(buildContainer(deck.parent))
  subscribe(deck)
}

/** Create function to send message to iframe for navigation */
function createNavigateFunc(iframe: HTMLIFrameElement) {
  return (index: number, fragmentIndex: number) =>
    iframe.contentWindow!.postMessage(
      `navigate:${index},${fragmentIndex}`,
      window.origin === 'null' ? '*' : window.origin
    )
}
