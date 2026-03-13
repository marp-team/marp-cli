import { assertBespokeWithSyncKey, type BespokeWithSyncKey } from '../sync'
import { generateURLfromParams, storage } from '../utils'
import { presenterPrefix } from './presenter-view'

const normalView = (deck) => {
  assertBespokeWithSyncKey(deck)

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
function openPresenterView(this: BespokeWithSyncKey) {
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
function presenterUrl(this: BespokeWithSyncKey) {
  const params = new URLSearchParams(location.search)

  params.set('view', 'presenter')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}

export default normalView
