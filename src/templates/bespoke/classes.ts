// Based on https://github.com/bespokejs/bespoke-classes

const prefix = 'bespoke-marp-' as const

export default function bespokeClasses(deck) {
  deck.parent.classList.add(`${prefix}parent`)
  deck.slides.forEach((el: HTMLElement) => el.classList.add(`${prefix}slide`))

  deck.on('activate', (e) => {
    const activeClass = `${prefix}active` as const

    const slide: HTMLElement = e.slide
    const shouldResetAnim = !slide.classList.contains(activeClass)

    deck.slides.forEach((el: HTMLElement) => {
      el.classList.remove(activeClass)
      el.setAttribute('aria-hidden', 'true')
    })

    slide.classList.add(activeClass)
    slide.removeAttribute('aria-hidden')

    if (shouldResetAnim) {
      const activeReadyClass = `${activeClass}-ready` as const

      slide.classList.add(activeReadyClass)
      void document.body.clientHeight
      slide.classList.remove(activeReadyClass)
    }
  })
}
