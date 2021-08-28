import { classPrefix, toggleAriaHidden } from './utils'

// Based on https://github.com/bespokejs/bespoke-classes
const bespokeClasses = (deck) => {
  deck.parent.classList.add(`${classPrefix}parent`)
  deck.slides.forEach((el: HTMLElement) =>
    el.classList.add(`${classPrefix}slide`)
  )

  deck.on('activate', (e) => {
    const activeClass = `${classPrefix}active` as const

    const slide: HTMLElement = e.slide
    const slideClasses = slide.classList

    const shouldResetAnim = !slideClasses.contains(activeClass)

    deck.slides.forEach((el: HTMLElement) => {
      el.classList.remove(activeClass)
      toggleAriaHidden(el, true)
    })

    slideClasses.add(activeClass)
    toggleAriaHidden(slide, false)

    if (shouldResetAnim) {
      const activeReadyClass = `${activeClass}-ready` as const

      slideClasses.add(activeReadyClass)
      void document.body.clientHeight
      slideClasses.remove(activeReadyClass)
    }
  })
}

export default bespokeClasses
