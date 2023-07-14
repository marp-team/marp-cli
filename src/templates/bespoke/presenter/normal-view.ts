import { generateURLfromParams, storage } from '../utils'
import { presenterPrefix } from './presenter-view'

interface BespokeForPresenter { syncKey: string; [key: string]: any }

const validateDeck = (deck: any): deck is BespokeForPresenter =>
  deck.syncKey && typeof deck.syncKey === 'string'

const normalView = (deck) => {
  if (!validateDeck(deck))
    throw new Error(
      'The current instance of Bespoke.js is invalid for Marp bespoke presenter plugin.'
    )

  Object.defineProperties(deck, {
    openPresenterView: { enumerable: true, value: openPresenterView },
    presenterUrl: { enumerable: true, get: presenterUrl },
  })

  // Register keyboard shortcut if using localStorage is not restricted
  if (storage.available)
    document.addEventListener('keydown', (e) => {
      // `p` without modifier key (Alt, Control, and Command)
      if (e.key === 'p' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        deck.openPresenterView()
      }
    })
}

/** Open new window for presenter view. */
function openPresenterView(this: BespokeForPresenter) {
  const { max, floor } = Math
  const w = max(floor(window.innerWidth * 0.85), 640)
  const h = max(floor(window.innerHeight * 0.85), 360)

  return window.open(
    this.presenterUrl,
    presenterPrefix + this.syncKey,
    `width=${w},height=${h},menubar=no,toolbar=no`
  )
}

/** Returns URL of presenter view for current page. */
function presenterUrl(this: BespokeForPresenter) {
  const params = new URLSearchParams(location.search)

  params.set('view', 'presenter')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}

export default normalView
