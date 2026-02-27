const bespokeOverview = (deck) => {
  let active = false
  let focusIndex = 0

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

    // Use the slide's intrinsic aspect ratio to determine the scale
    const firstSlide = slides()[0]
    const viewBox = firstSlide?.getAttribute('viewBox')
    let slideW = rect.width
    let slideH = rect.height

    if (viewBox) {
      const parts = viewBox.split(/\s+/)
      slideW = parseFloat(parts[2])
      slideH = parseFloat(parts[3])
    }

    // Scale so the slide fits within the cell
    const scaleX = cellW / rect.width
    const scaleY = cellH / rect.height
    const cellScale = Math.min(scaleX, scaleY)

    // Actual rendered size of each slide after scaling
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

  const clearLayout = () => {
    slides().forEach((slide) => {
      slide.style.transform = ''
      slide.style.transformOrigin = ''
    })
  }

  const updateFocus = () => {
    slides().forEach((slide, i) => {
      slide.classList.toggle('bespoke-marp-overview-focus', i === focusIndex)
    })
  }

  const activate = () => {
    if (active) return
    active = true
    focusIndex = deck.slide()
    document.body.setAttribute('data-bespoke-overview', '')
    applyLayout()
    updateFocus()
  }

  const deactivate = (navigateTo?: number) => {
    if (!active) return
    active = false
    document.body.removeAttribute('data-bespoke-overview')
    clearLayout()

    slides().forEach((slide) => {
      slide.classList.remove('bespoke-marp-overview-focus')
    })

    if (navigateTo !== undefined) {
      deck.slide(navigateTo)
    }
  }

  const toggle = () => {
    if (active) {
      deactivate(focusIndex)
    } else {
      activate()
    }
  }

  // Keyboard handling (capture phase to intercept before navigation plugin)
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        (e.key === 'o' || e.key === 'Escape') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault()
        e.stopPropagation()
        toggle()
        return
      }

      if (!active) return

      const cols = columns()

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        deactivate(focusIndex)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        focusIndex = Math.min(focusIndex + 1, slideCount() - 1)
        updateFocus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        focusIndex = Math.max(focusIndex - 1, 0)
        updateFocus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        focusIndex = Math.min(focusIndex + cols, slideCount() - 1)
        updateFocus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        focusIndex = Math.max(focusIndex - cols, 0)
        updateFocus()
      }
    },
    { capture: true }
  )

  // Block navigation events while overview is active
  deck.on('next', () => {
    if (active) return false
  })

  deck.on('prev', () => {
    if (active) return false
  })

  deck.on('slide', (e) => {
    if (!active) return
    if (e.forSync) {
      focusIndex = e.index
      updateFocus()
    }
    return false
  })

  // Click handling: click a slide to navigate to it
  slides().forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (active) {
        deactivate(i)
      }
    })
  })

  // Recalculate layout on resize
  window.addEventListener('resize', () => {
    if (active) applyLayout()
  })
}

export default bespokeOverview
