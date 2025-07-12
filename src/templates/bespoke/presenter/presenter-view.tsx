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
  thumbnailsContainer: `${presenterPrefix}thumbnails-container`,
  thumbnailsWrapper: `${presenterPrefix}thumbnails-wrapper`,
  thumbnail: `${presenterPrefix}thumbnail`,
  thumbnailActive: `${presenterPrefix}thumbnail-active`,
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

  // Store cleanup functions for memory management
  const cleanup = new Set<() => void>()

  // Add cleanup function helper
  const addCleanup = (cleanupFn: () => void) => {
    cleanup.add(cleanupFn)
  }

  // Cleanup all resources when window is closed
  const performCleanup = () => {
    cleanup.forEach(cleanupFn => {
      try {
        cleanupFn()
      } catch (error) {
        console.debug('Error during cleanup:', error)
      }
    })
    cleanup.clear()
  }

  // Listen for window close events
  window.addEventListener('beforeunload', performCleanup)
  window.addEventListener('unload', performCleanup)
  addCleanup(() => {
    window.removeEventListener('beforeunload', performCleanup)
    window.removeEventListener('unload', performCleanup)
  })

  // Preload external assets for better iframe performance
  const preloadExternalAssets = () => {
    const extractedUrls = new Set<string>()

    // Extract URLs from CSS rules
    const extractFromCSS = (css: string) => {
      // Match url() declarations in CSS
      const urlMatches = css.match(/url\(([^)]+)\)/g)
      if (urlMatches) {
        urlMatches.forEach(match => {
          let url = match.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1')
          // Only preload external URLs (http/https) and skip data URIs and relative paths
          if (url.startsWith('http')) {
            extractedUrls.add(url)
          }
        })
      }
    }

    // Extract from all stylesheets
    for (const stylesheet of document.styleSheets) {
      try {
        if (stylesheet.cssRules) {
          for (const rule of stylesheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              extractFromCSS(rule.cssText)
            } else if (rule instanceof CSSImportRule) {
              if (rule.href && rule.href.startsWith('http')) {
                extractedUrls.add(rule.href)
              }
            } else if (rule instanceof CSSFontFaceRule) {
              extractFromCSS(rule.cssText)
            }
          }
        }
      } catch (e) {
        // Skip CORS-restricted stylesheets
        console.debug('Could not access stylesheet:', e)
      }
    }

    // Extract from inline styles
    document.querySelectorAll('*').forEach(element => {
      const style = (element as HTMLElement).style
      if (style && style.cssText) {
        extractFromCSS(style.cssText)
      }
    })

    // Extract from computed styles of key elements (fonts are often defined here)
    const slidesContainer = document.querySelector('.bespoke-marp-parent')
    if (slidesContainer) {
      const computedStyle = window.getComputedStyle(slidesContainer)
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i]
        const value = computedStyle.getPropertyValue(prop)
        if (value) {
          extractFromCSS(`${prop}: ${value}`)
        }
      }
    }

    // Preload extracted assets
    extractedUrls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'

      // Determine resource type based on URL
      if (url.match(/\.(woff2?|ttf|otf|eot)(\?.*)?$/i)) {
        link.as = 'font'
        link.crossOrigin = 'anonymous'
      } else if (url.match(/\.css(\?.*)?$/i)) {
        link.as = 'style'
      } else {
        link.as = 'fetch'
        link.crossOrigin = 'anonymous'
      }

      link.href = url
      document.head.appendChild(link)
    })

    console.debug(`Preloaded ${extractedUrls.size} external assets for thumbnails`)
  }

  // Setup template for presenter view
  const buildContainer = (deckElement: HTMLElement) => {
    const container = document.createElement('div')
    container.className = classes.container

    container.appendChild(deckElement)
    container.insertAdjacentHTML(
      'beforeend',
      <>
        <div class={classes.thumbnailsContainer}>
          <div class={classes.thumbnailsWrapper} />
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
    // Splitter
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

    // Add cleanup for window event listeners
    addCleanup(() => {
      $(classes.dragbar).removeEventListener('mousedown', startDragging)
      window.removeEventListener('mouseup', endDragging)
      window.removeEventListener('mousemove', onDragging)
    })

        // Thumbnails view
    const createThumbnails = async () => {
      const thumbnailsWrapper = $(classes.thumbnailsWrapper)
      const totalSlides = deck.slides.length

      // Clear existing thumbnails
      thumbnailsWrapper.innerHTML = ''

      // Create individual thumbnail
      const createThumbnail = async (i: number) => {
        const thumbnailContainer = document.createElement('div')
        thumbnailContainer.className = classes.thumbnail
        thumbnailContainer.dataset.slideIndex = i.toString()

        // Add loading indicator
        const loadingDiv = document.createElement('div')
        loadingDiv.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #999;
          font-size: 12px;
          z-index: 2;
          background: rgba(255, 255, 255, 0.9);
          padding: 4px 8px;
          border-radius: 4px;
        `
        loadingDiv.textContent = `Loading...`
        thumbnailContainer.appendChild(loadingDiv)

        // Create iframe with unique URL
        const iframe = document.createElement('iframe')
        // Use a unique URL for each slide to prevent caching issues
        iframe.src = `?view=next&slide=${i}&t=${Date.now()}-${i}`
        iframe.style.cssText = `
          border: none;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        `

        thumbnailContainer.appendChild(iframe)
        thumbnailsWrapper.appendChild(thumbnailContainer)

        // Add click handler for navigation
        const thumbnailClickHandler = () => {
          deck.slide(i)
        }
        thumbnailContainer.addEventListener('click', thumbnailClickHandler)

        // Add cleanup for thumbnail click handler
        addCleanup(() => {
          thumbnailContainer.removeEventListener('click', thumbnailClickHandler)
        })

        // Create navigation function for this iframe
        const navFunc = createNavigateFunc(iframe)

        // Track if navigation is complete
        let navigationComplete = false

        const iframeLoadHandler = () => {
          // Small delay to ensure the iframe content is ready
          setTimeout(() => {
            // Navigate to the specific slide with fragment 0
            navFunc(i, 0)

            // Set a timeout to show the iframe even if navigation doesn't complete
            setTimeout(() => {
              if (!navigationComplete) {
                navigationComplete = true
                iframe.style.opacity = '1'
                loadingDiv.remove()
              }
            }, 1000)
          }, 50)
        }

        iframe.addEventListener('load', iframeLoadHandler)

        // Listen for navigation completion message from iframe
        const messageHandler = (event: MessageEvent) => {
          if (event.source === iframe.contentWindow &&
              event.data === `navigation-complete:${i}`) {
            navigationComplete = true
            iframe.style.opacity = '1'
            loadingDiv.remove()
            window.removeEventListener('message', messageHandler)
          }
        }
        window.addEventListener('message', messageHandler)

        // Add error handling
        const iframeErrorHandler = () => {
          loadingDiv.textContent = 'Error loading'
          loadingDiv.style.color = '#ff6b6b'
        }

        iframe.addEventListener('error', iframeErrorHandler)

        // Add cleanup for iframe handlers
        addCleanup(() => {
          iframe.removeEventListener('load', iframeLoadHandler)
          iframe.removeEventListener('error', iframeErrorHandler)
          window.removeEventListener('message', messageHandler)
        })
      }

      // Load thumbnails in batches to avoid overwhelming the browser
      const batchSize = 5
      const batches: number[][] = []
      for (let i = 0; i < totalSlides; i += batchSize) {
        batches.push(Array.from({ length: Math.min(batchSize, totalSlides - i) }, (_, j) => i + j))
      }

      // Process batches sequentially
      for (const batch of batches) {
        await Promise.all(batch.map(i => createThumbnail(i)))
        // Small delay between batches to prevent overwhelming
        if (batch !== batches[batches.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    }

        // Handle fragment updates for thumbnails
    const fragmentHandler = ({ index, fragmentIndex }) => {
      // Update the current slide's iframe with fragment
      const currentThumbnail = document.querySelector(`.${classes.thumbnail}[data-slide-index="${index}"]`)
      if (currentThumbnail) {
        const iframe = currentThumbnail.querySelector('iframe') as HTMLIFrameElement
        if (iframe && iframe.contentWindow) {
          const navFunc = createNavigateFunc(iframe)
          navFunc(index, fragmentIndex)
        }
      }
    }

    deck.on('fragment', fragmentHandler)
    addCleanup(() => {
      deck.off('fragment', fragmentHandler)
    })

    // Preload external assets before creating thumbnails
    preloadExternalAssets()

    // Initialize thumbnails
    createThumbnails().then(() => {
      // Set initial active state after thumbnails are created
      setActiveThumbnail(deck.slide())
    })

    // Set active thumbnail and scroll it into view
    const setActiveThumbnail = (index: number) => {
      const thumbnails = document.querySelectorAll(`.${classes.thumbnail}`)
      thumbnails.forEach((thumb) => {
        const slideIndex = parseInt((thumb as HTMLElement).dataset.slideIndex || '0', 10)
        const isActive = slideIndex === index
        thumb.classList.toggle(classes.thumbnailActive, isActive)
        if (isActive) {
          (thumb as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    }

    // Set initial active state
    setActiveThumbnail(deck.slide())

    // Update active thumbnail when slide changes
    const activateHandler = ({ index }) => {
      setActiveThumbnail(index)
    }

    deck.on('activate', activateHandler)
    addCleanup(() => {
      deck.off('activate', activateHandler)
    })

    // Note: Fragment updates are not needed for static thumbnails
    // The thumbnails show the base slide content without fragments

    // Presenter note
    const notes = document.querySelectorAll<HTMLElement>('.bespoke-marp-note')

    const noteKeydownHandlers = new Map<HTMLElement, (e: KeyboardEvent) => void>()

    notes.forEach((note) => {
      const keydownHandler = (e: KeyboardEvent) => e.stopPropagation()
      note.addEventListener('keydown', keydownHandler)
      noteKeydownHandlers.set(note, keydownHandler)
      $(classes.noteWrapper).appendChild(note)
    })

    addCleanup(() => {
      noteKeydownHandlers.forEach((handler, note) => {
        note.removeEventListener('keydown', handler)
      })
      noteKeydownHandlers.clear()
    })

    const noteActivateHandler = () =>
      notes.forEach((n) =>
        n.classList.toggle('active', n.dataset.index == deck.slide())
      )

    deck.on('activate', noteActivateHandler)
    addCleanup(() => {
      deck.off('activate', noteActivateHandler)
    })

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

    const biggerClickHandler = () => {
      noteButtonBigger.blur()
      biggerNotesFont()
    }

    const smallerClickHandler = () => {
      noteButtonSmaller.blur()
      smallerNotesFont()
    }

    noteButtonBigger.addEventListener('click', biggerClickHandler)
    noteButtonSmaller.addEventListener('click', smallerClickHandler)

    addCleanup(() => {
      noteButtonBigger.removeEventListener('click', biggerClickHandler)
      noteButtonSmaller.removeEventListener('click', smallerClickHandler)
    })

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === '+') biggerNotesFont()
      if (e.key === '-') smallerNotesFont()
    }

    document.addEventListener('keydown', keydownHandler, true)
    addCleanup(() => {
      document.removeEventListener('keydown', keydownHandler, true)
    })

    // Page info
    const pageActivateHandler = ({ index }) => {
      $(classes.infoPageText).textContent = `${index + 1} / ${
        deck.slides.length
      }`
    }

    deck.on('activate', pageActivateHandler)
    addCleanup(() => {
      deck.off('activate', pageActivateHandler)
    })

    const prev = $<HTMLButtonElement>(classes.infoPagePrev)
    const next = $<HTMLButtonElement>(classes.infoPageNext)

    const prevClickHandler = (e: MouseEvent) => {
      prev.blur()
      deck.prev({ fragment: !e.shiftKey })
    }

    const nextClickHandler = (e: MouseEvent) => {
      next.blur()
      deck.next({ fragment: !e.shiftKey })
    }

    prev.addEventListener('click', prevClickHandler)
    next.addEventListener('click', nextClickHandler)

    addCleanup(() => {
      prev.removeEventListener('click', prevClickHandler)
      next.removeEventListener('click', nextClickHandler)
    })

    const fragmentHandlerForButtons = ({ index, fragments, fragmentIndex }) => {
      prev.disabled = index === 0 && fragmentIndex === 0
      next.disabled =
        index === deck.slides.length - 1 &&
        fragmentIndex === fragments.length - 1
    }

    deck.on('fragment', fragmentHandlerForButtons)
    addCleanup(() => {
      deck.off('fragment', fragmentHandlerForButtons)
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
    const updateInterval = setInterval(update, 250)

    // Add cleanup for the interval
    addCleanup(() => {
      clearInterval(updateInterval)
    })

    const timerClickHandler = () => {
      startTime = new Date()
    }

    $(classes.infoTimer).addEventListener('click', timerClickHandler)
    addCleanup(() => {
      $(classes.infoTimer).removeEventListener('click', timerClickHandler)
    })
  }

  document.body.appendChild(buildContainer(deck.parent))
  subscribe(deck)
}

export default presenterView
