const nextView = (deck) => {
  // Get slide parameter from URL
  const urlParams = new URLSearchParams(window.location.search)
  const slideParam = urlParams.get('slide')

  // If slide parameter is provided, navigate to that specific slide after deck is ready
  if (slideParam !== null) {
    const slideIndex = parseInt(slideParam, 10)
    if (!isNaN(slideIndex) && slideIndex >= 0 && slideIndex < deck.slides.length) {
      // Wait for deck to be fully ready before navigating
      const navigateToSlide = () => {
        deck.slide(slideIndex, { fragment: 0 })

        // Send completion message to parent after initial navigation
        setTimeout(() => {
          window.parent.postMessage(
            `navigation-complete:${slideIndex}`,
            window.origin === 'null' ? '*' : window.origin
          )
        }, 150)
      }

      // Use setTimeout to ensure deck is fully initialized
      setTimeout(navigateToSlide, 100)
    }
  }

  // Listen "navigate" message from parent
  const listener = (e: MessageEvent) => {
    if (e.origin !== window.origin) return

    const [dir, args] = e.data.split(':')

    if (dir === 'navigate') {
      const [sIdx, sFragIdx] = args.split(',')
      const idx = Number.parseInt(sIdx, 10)
      const fragment = Number.parseInt(sFragIdx, 10)

            // For thumbnails, we want to show the exact slide and fragment
      // without the "next slide" logic
      deck.slide(idx, { fragment })

      // Wait for the slide change to complete before sending message
      const sendCompletionMessage = () => {
        window.parent.postMessage(
          `navigation-complete:${idx}`,
          window.origin === 'null' ? '*' : window.origin
        )
      }

      // Listen for the activate event to know when slide change is complete
      const onActivate = (e: any) => {
        if (e.index === idx) {
          deck.off('activate', onActivate)
          // Small delay to ensure rendering is complete
          setTimeout(sendCompletionMessage, 100)
        }
      }

      deck.on('activate', onActivate)

      // Fallback timeout in case activate event doesn't fire
      setTimeout(() => {
        deck.off('activate', onActivate)
        sendCompletionMessage()
      }, 500)
    }
  }

  window.addEventListener('message', listener)

  // Cleanup on window close
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('message', listener)
  })

  window.addEventListener('unload', () => {
    window.removeEventListener('message', listener)
  })
}

export default nextView
