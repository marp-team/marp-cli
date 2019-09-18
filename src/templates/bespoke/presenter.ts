import { generateURLfromParams, isCurrentView, ViewMode } from './utils'

type BespokeForPresenter = { syncKey: string; [key: string]: any }

const validateDeck = (deck: any): deck is BespokeForPresenter =>
  deck.syncKey && typeof deck.syncKey === 'string'

export const bespokePresenterPreprocess = (target: HTMLElement) => {
  if (isCurrentView(ViewMode.Next)) {
    // Add blank slide
    const span = document.createElement('span')
    target.appendChild(span)
  }
}

export default function bespokePresenter() {
  return deck => {
    if (isCurrentView(ViewMode.Normal)) forNormalView(deck)
    if (isCurrentView(ViewMode.Presenter)) forPresenterView(deck)
    if (isCurrentView(ViewMode.Next)) forNextView(deck)
  }
}

function forNormalView(deck) {
  if (!validateDeck(deck))
    throw new Error(
      'The current instance of Bespoke.js is invalid for Marp bespoke presenter plugin.'
    )

  Object.defineProperties(deck, {
    openPresenterView: { enumerable: true, value: openPresenterView },
    presenterUrl: { enumerable: true, get: presenterUrl },
  })
}

function forPresenterView(deck) {
  // Update title
  const { title } = document
  document.title = `[Presenter view]${title ? ` - ${title}` : ''}`

  // Next slide view
  const nextParent = document.createElement('div')
  nextParent.className = 'bespoke-marp-presenter-next-parent'
  nextParent.addEventListener('click', () => deck.next())

  const next = document.createElement('iframe')

  next.addEventListener('load', () => {
    nextParent.classList.add('active')

    const navigate = (idx: number, fragIdx: number) => {
      const origin = window.origin === 'null' ? '*' : window.origin
      next.contentWindow!.postMessage(`navigate:${idx},${fragIdx}`, origin)
    }

    // Navigate slide
    navigate(deck.slide(), deck.fragmentIndex)

    deck.on('fragment', ({ index, fragmentIndex }) =>
      navigate(index, fragmentIndex)
    )
  })

  next.className = 'bespoke-marp-presenter-next'
  next.src = '?view=next'

  nextParent.appendChild(next)
  deck.parent.appendChild(nextParent)

  // Presenter notes
  const notes = document.querySelectorAll<HTMLElement>('.bespoke-marp-note')
  notes.forEach(note => deck.parent.appendChild(note))

  deck.on('activate', () => {
    notes.forEach(note =>
      note.classList.toggle(
        'active',
        Number.parseInt(note.dataset.index || '', 10) === deck.slide()
      )
    )
  })
}

function forNextView(deck) {
  window.addEventListener('message', e => {
    if (e.origin !== window.origin) return

    const [dir, args] = e.data.split(':')

    if (dir === 'navigate') {
      const [idx, fragIdx] = args.split(',')

      deck.slide(Number.parseInt(idx, 10), {
        fragment: Number.parseInt(fragIdx, 10),
      })
      deck.next()
    }
  })
}

function openPresenterView(this: BespokeForPresenter) {
  const w = Math.max(Math.floor(window.innerWidth * 0.85), 640)
  const h = Math.max(Math.floor(window.innerHeight * 0.85), 360)

  return window.open(
    this.presenterUrl,
    `bespoke-marp-presenter-${this.syncKey}`,
    `width=${w},height=${h},menubar=no,toolbar=no`
  )
}

function presenterUrl(this: BespokeForPresenter) {
  const params = new URLSearchParams(location.search)

  params.set('view', 'presenter')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}
