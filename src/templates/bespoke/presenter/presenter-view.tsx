/** @jsx h */
import h from 'vhtml'
import { Timer } from './timer'

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
  infoTimerStart: 'bespoke-marp-presenter-info-timer-start',
  infoTimerStop: 'bespoke-marp-presenter-info-timer-stop',
  infoTimerRestart: 'bespoke-marp-presenter-info-timer-restart',
  infoTime: 'bespoke-marp-presenter-info-time',
  infoTimer: 'bespoke-marp-presenter-info-timer',
  infoTimerText: 'bespoke-marp-presenter-info-timer-text',
} as const

/** Create function to send message to iframe for navigation */
const createNavigateFunc = (iframe: HTMLIFrameElement) => (
  index: number,
  fragmentIndex: number
) =>
  iframe.contentWindow?.postMessage(
    `navigate:${index},${fragmentIndex}`,
    window.origin === 'null' ? '*' : window.origin
  )

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
          <div class={classes.infoTimer}>
            <div class={classes.infoTimerText} title="Elapsed time"></div>
            <button
              class={classes.infoTimerStart}
              tabindex="-1"
              title="Start timer"
            >
              Start timer
            </button>
            <button
              class={classes.infoTimerStop}
              tabindex="-1"
              title="Stop timer"
            >
              Stop timer
            </button>
            <button
              class={classes.infoTimerRestart}
              tabindex="-1"
              title="Restart timer"
            >
              Restart timer
            </button>
          </div>
        </div>
      </Fragment>
    )

    return container
  }

  const $cache: { -readonly [T in keyof typeof classes]?: HTMLElement } = {}
  const $ = (klass: typeof classes[keyof typeof classes]): HTMLElement => {
    $cache[klass] =
      $cache[klass] || document.querySelector<HTMLElement>(`.${klass}`)

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
    const startTimer = $(classes.infoTimerStart) as HTMLButtonElement
    const stopTimer = $(classes.infoTimerStop) as HTMLButtonElement
    const restartTimer = $(classes.infoTimerRestart) as HTMLButtonElement
    const timer = new Timer()

    prev.addEventListener('click', (e) => {
      prev.blur()
      deck.prev({ fragment: !e.shiftKey })
    })

    next.addEventListener('click', (e) => {
      next.blur()
      deck.next({ fragment: !e.shiftKey })
    })

    startTimer.addEventListener('click', (e) => {
      startTimer.blur()
      timer.start()
    })

    stopTimer.addEventListener('click', (e) => {
      stopTimer.blur()
      timer.stop()
    })

    restartTimer.addEventListener('click', (e) => {
      restartTimer.blur()
      timer.restart()
    })

    deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
      prev.disabled = index === 0 && fragmentIndex === 0
      next.disabled =
        index === deck.slides.length - 1 &&
        fragmentIndex === fragments.length - 1
    })

    // Current time
    const update = () => {
      $(classes.infoTime).textContent = new Date().toLocaleTimeString()
      $(classes.infoTimerText).textContent = new Date(
        timer.elapsed()
      ).toLocaleTimeString(undefined, { timeZone: 'utc' })
    }

    update()
    setInterval(update, 250)
  }

  document.body.appendChild(buildContainer(deck.parent))
  subscribe(deck)
}
