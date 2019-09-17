import { generateURLfromParams, readQuery } from './utils'

type BespokeForPresenter = { syncKey: string; [key: string]: any }

enum BespokeMarpView {
  Normal = '',
  Presenter = 'presenter',
  Next = 'next',
}

const validateDeck = (deck: any): deck is BespokeForPresenter =>
  deck.syncKey && typeof deck.syncKey === 'string'

export default function bespokePresenter() {
  let view: BespokeMarpView = BespokeMarpView.Normal

  if (readQuery('presenter') !== null) {
    view = BespokeMarpView.Presenter

    const { title } = document
    document.title = `[Presenter view]${title ? ` - ${title}` : ''}`
  }

  document.body.setAttribute('data-marp-view', view)

  return deck => {
    if (!validateDeck(deck))
      throw new Error(
        'The current instance of Bespoke.js is invalid for Marp bespoke presenter plugin.'
      )

    Object.defineProperties(deck, {
      openPresenterView: { enumerable: true, value: openPresenterView },
      presenterUrl: { enumerable: true, get: presenterUrl },
    })
  }
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

  params.set('presenter', '')
  params.set('sync', this.syncKey)

  return generateURLfromParams(params)
}
