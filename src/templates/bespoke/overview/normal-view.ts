import { generateURLfromParams, storage } from '../utils'

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
  location.href = this.overviewUrl
}

function overviewUrl(this: BespokeForOverview) {
  const params = new URLSearchParams(location.search)

  params.set('view', 'overview')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}

export default normalView
