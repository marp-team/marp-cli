import { classPrefix } from '../utils'

const overviewActiveClass = `${classPrefix}overview-active`

const overviewView = () => (deck) => {
  const { title } = document
  document.title = `[Overview]${title ? ` - ${title}` : ''}`

  const slides = (): SVGElement[] => deck.slides
  const slideCount = () => slides().length
  const columns = () => Math.ceil(Math.sqrt(slideCount()))

  const applyLayout = () => {
    const cols = columns()
    const rows = Math.ceil(slideCount() / cols)
    const parent = deck.parent as HTMLElement
    const rect = parent.getBoundingClientRect()
    const gap = 20
    const cellW = (rect.width - gap * (cols + 1)) / cols
    const cellH = (rect.height - gap * (rows + 1)) / rows

    const scaleX = cellW / rect.width
    const scaleY = cellH / rect.height
    const cellScale = Math.min(scaleX, scaleY)

    const renderedW = rect.width * cellScale
    const renderedH = rect.height * cellScale

    slides().forEach((slide, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = gap + col * (renderedW + gap)
      const y = gap + row * (renderedH + gap)

      slide.style.transformOrigin = '0 0'
      slide.style.transform = `translate(${x}px, ${y}px) scale(${cellScale})`
    })
  }

  const updateHighlight = (index: number) => {
    slides().forEach((slide, i) => {
      slide.classList.toggle(overviewActiveClass, i === index)
    })
  }

  // Click a slide to navigate (syncs to other windows via bespokeSync)
  slides().forEach((slide, i) => {
    slide.addEventListener('click', () => {
      deck.slide(i)
    })
  })

  // Arrow key navigation within the grid
  document.addEventListener('keydown', (e) => {
    const cols = columns()
    const current = deck.slide()

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      deck.slide(Math.min(current + 1, slideCount() - 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      deck.slide(Math.max(current - 1, 0))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      deck.slide(Math.min(current + cols, slideCount() - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      deck.slide(Math.max(current - cols, 0))
    }
  })

  // Update highlight on any slide change (including sync from other windows)
  deck.on('fragment', ({ index }) => {
    updateHighlight(index)
  })

  // Initial layout and highlight
  applyLayout()
  updateHighlight(deck.slide())

  // Recalculate layout on resize
  window.addEventListener('resize', () => applyLayout())
}

export default overviewView
