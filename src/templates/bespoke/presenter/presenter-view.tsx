/** @jsx h */
/** @jsxFrag Fragment */
import h from 'vhtml'
import { classPrefix } from '../utils'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Fragment: any = ({ children }) => h(null, null, ...children)

export const presenterPrefix = `${classPrefix}presenter-` as const
export const classes = {
  container: `${presenterPrefix}container`,
  dragbar: `${presenterPrefix}dragbar-container`,
  next: `${presenterPrefix}next`,
  nextContainer: `${presenterPrefix}next-container`,
  noteContainer: `${presenterPrefix}note-container`,
  noteWrapper: `${presenterPrefix}note-wrapper`,
  noteButtons: `${presenterPrefix}note-buttons`,
  infoContainer: `${presenterPrefix}info-container`,
  infoPage: `${presenterPrefix}info-page`,
  infoPageText: `${presenterPrefix}info-page-text`,
  infoPagePrev: `${presenterPrefix}info-page-prev`,
  infoPageNext: `${presenterPrefix}info-page-next`,
  noteButtonsBigger: `${presenterPrefix}note-bigger`,
  noteButtonsSmaller: `${presenterPrefix}note-smaller`,
  infoTime: `${presenterPrefix}info-time`,
  infoTimer: `${presenterPrefix}info-timer`,
} as const

export const properties = {
  noteFontScale: '--bespoke-marp-note-font-scale',
} as const

/** Create function to send message to iframe for navigation */
const createNavigateFunc =
  (iframe: HTMLIFrameElement) => (index: number, fragmentIndex: number) =>
    iframe.contentWindow?.postMessage(
      `navigate:${index},${fragmentIndex}`,
      window.origin === 'null' ? '*' : window.origin
    )

const presenterView = (deck) => {
  const { title } = document
  document.title = `[Presenter view]${title ? ` - ${title}` : ''}`

  // Setup template for presenter view
  const buildContainer = (deckElement: HTMLElement) => {
    const container = document.createElement('div')
    container.className = classes.container

    container.appendChild(deckElement)
    container.insertAdjacentHTML(
      'beforeend',
      <>
        <div class={classes.nextContainer}>
          <iframe class={classes.next} src="?view=next" />
        </div>
        <div class={classes.dragbar}></div>
        <div class={classes.noteContainer}>
          <div class={classes.noteWrapper} />
          <div class={classes.noteButtons}>
            <button
              class={classes.noteButtonsSmaller}
              tabindex="-1"
              title="Smaller notes font size"
            >
              Smaller notes font size
            </button>
            <button
              class={classes.noteButtonsBigger}
              tabindex="-1"
              title="Bigger notes font size"
            >
              Bigger notes font size
            </button>
          </div>
        </div>
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
          <time class={classes.infoTimer} title="Timer"></time>
        </div>
      </>
    )

    return container
  }

  const $cache: { -readonly [T in keyof typeof classes]?: HTMLElement } = {}
  const $ = <T extends HTMLElement>(
    klass: (typeof classes)[keyof typeof classes]
  ): T => {
    $cache[klass] = $cache[klass] || document.querySelector<T>(`.${klass}`)

    return $cache[klass]
  }

  const subscribe = (deck) => {
    // Horizontal splitter
    let isDragging = false

    const startDragging = () => {
      isDragging = true
      $(classes.dragbar).classList.add('active')
    }

    const endDragging = () => {
      isDragging = false
      $(classes.dragbar).classList.remove('active')
    }

    const onDragging = (event: MouseEvent) => {
      if (!isDragging) return

      const splitRatio =
        (event.clientX / document.documentElement.clientWidth) * 100

      $(classes.container).style.setProperty(
        '--bespoke-marp-presenter-split-ratio',
        `${Math.max(0, Math.min(100, splitRatio))}%`
      )
    }

    $(classes.dragbar).addEventListener('mousedown', startDragging)
    window.addEventListener('mouseup', endDragging)
    window.addEventListener('mousemove', onDragging)

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
      $(classes.noteWrapper).appendChild(note)
    })

    deck.on('activate', () =>
      notes.forEach((n) =>
        n.classList.toggle('active', n.dataset.index == deck.slide())
      )
    )

    // Presenter note buttons
    let notesFontSizeBase = 0
    const resizeNotesFont = (increment: number) => {
      notesFontSizeBase = Math.max(-5, notesFontSizeBase + increment)

      $(classes.noteContainer).style.setProperty(
        properties.noteFontScale,
        (1.2 ** notesFontSizeBase).toFixed(4)
      )
    }
    const biggerNotesFont = () => resizeNotesFont(1)
    const smallerNotesFont = () => resizeNotesFont(-1)

    const noteButtonBigger = $<HTMLButtonElement>(classes.noteButtonsBigger)
    const noteButtonSmaller = $<HTMLButtonElement>(classes.noteButtonsSmaller)

    noteButtonBigger.addEventListener('click', () => {
      noteButtonBigger.blur()
      biggerNotesFont()
    })

    noteButtonSmaller.addEventListener('click', () => {
      noteButtonSmaller.blur()
      smallerNotesFont()
    })

    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === '+') biggerNotesFont()
        if (e.key === '-') smallerNotesFont()
      },
      true // Ignore stopped propagation in notes
    )

    // Page info
    deck.on('activate', ({ index }) => {
      $(classes.infoPageText).textContent = `${index + 1} / ${
        deck.slides.length
      }`
    })

    const prev = $<HTMLButtonElement>(classes.infoPagePrev)
    const next = $<HTMLButtonElement>(classes.infoPageNext)

    prev.addEventListener('click', (e) => {
      prev.blur()
      deck.prev({ fragment: !e.shiftKey })
    })

    next.addEventListener('click', (e) => {
      next.blur()
      deck.next({ fragment: !e.shiftKey })
    })

    deck.on('fragment', ({ index, fragments, fragmentIndex }) => {
      prev.disabled = index === 0 && fragmentIndex === 0
      next.disabled =
        index === deck.slides.length - 1 &&
        fragmentIndex === fragments.length - 1
    })

    // Current time and presenter timer
    let startTime = new Date()

    const update = () => {
      const time = new Date()

      const formatTime = (time: number) =>
        `${Math.floor(time)}`.padStart(2, '0')

      const diff = time.getTime() - startTime.getTime()

      const seconds = formatTime((diff / 1000) % 60)
      const minutes = formatTime((diff / 1000 / 60) % 60)
      const hours = formatTime((diff / (1000 * 60 * 60)) % 24)

      $(classes.infoTime).textContent = time.toLocaleTimeString()
      $(classes.infoTimer).textContent = `${hours}:${minutes}:${seconds}`
    }

    update()
    setInterval(update, 250)

    $(classes.infoTimer).addEventListener('click', () => {
      startTime = new Date()
    })
  }

  document.body.appendChild(buildContainer(deck.parent))
  subscribe(deck)
}

export default presenterView
