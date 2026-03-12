import { classPrefix, generateURLfromParams, storage } from '../utils'

export const overviewPrefix = `${classPrefix}overview-` as const

interface BespokeForOverview {
  syncKey: string
  [key: string]: any
}

const validateDeck = (deck: any): deck is BespokeForOverview =>
  deck.syncKey && typeof deck.syncKey === 'string'

const normalView = (deck) => {
  if (!validateDeck(deck)) return

  Object.defineProperties(deck, {
    openOverviewView: { enumerable: true, value: openOverviewView },
    overviewUrl: { enumerable: true, get: overviewUrl },
  })

  if (storage.available)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'o' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        deck.openOverviewView()
      }
    })
}

function openOverviewView(this: BespokeForOverview) {
  const { max, floor } = Math
  const w = max(floor(window.innerWidth * 0.85), 640)
  const h = max(floor(window.innerHeight * 0.85), 360)

  return window.open(
    this.overviewUrl,
    overviewPrefix + this.syncKey,
    `width=${w},height=${h},menubar=no,toolbar=no`
  )
}

function overviewUrl(this: BespokeForOverview) {
  const params = new URLSearchParams(location.search)

  params.set('view', 'overview')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}

export default normalView
