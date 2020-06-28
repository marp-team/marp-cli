// Based on https://github.com/bespokejs/bespoke-classes

export default function bespokeClasses(deck) {
  deck.parent.classList.add('bespoke-marp-parent')
  deck.slides.forEach((el: HTMLElement) =>
    el.classList.add('bespoke-marp-slide')
  )

  deck.on('activate', (e) => {
    const slide: HTMLElement = e.slide
    const shouldResetAnim = !slide.classList.contains('bespoke-marp-active')

    deck.slides.forEach((el: HTMLElement) => {
      el.classList.remove('bespoke-marp-active')
      el.setAttribute('aria-hidden', 'true')
    })

    slide.classList.add('bespoke-marp-active')
    slide.removeAttribute('aria-hidden')

    if (shouldResetAnim) {
      slide.classList.add('bespoke-marp-active-ready')
      void document.body.clientHeight
      slide.classList.remove('bespoke-marp-active-ready')
    }
  })
}
