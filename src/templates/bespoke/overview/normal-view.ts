import { assertBespokeWithSyncKey } from '../sync'
import { generateURLfromParams, classPrefix } from '../utils'
import { attachToggleKey } from './utils'

let overviewContainer: HTMLDivElement | null = null

interface OverviewNormalViewOption {
  closeOnSelect?: boolean
}

const normalView =
  ({ closeOnSelect = true }: OverviewNormalViewOption = {}) =>
  (deck) => {
    assertBespokeWithSyncKey(deck)

    const getOverviewUrl = () => {
      const params = new URLSearchParams(location.search)

      params.set('view', 'overview')
      params.set('sync', deck.syncKey)
      if (closeOnSelect) params.set('closeOnSelect', '1')

      return generateURLfromParams(params)
    }

    const getOverviewContainer = () => {
      if (!overviewContainer || !overviewContainer.isConnected) {
        overviewContainer = document.createElement('div')
        overviewContainer.className = `${classPrefix}overview`
        overviewContainer.inert = true

        const iframe = document.createElement('iframe')
        iframe.src = getOverviewUrl()

        overviewContainer.append(iframe)
        document.body.append(overviewContainer)
      }

      return overviewContainer
    }

    const toggleOverviewView = (state?: boolean) => {
      // To prevent double network requests for the slide page by <iframe>, DOM should be created when requested.
      const container = getOverviewContainer()
      const nextState = state ?? !container.dataset.open

      // Apply state after a delay to wait for ready of the transition
      setTimeout(() => {
        container.dataset.open = nextState ? '1' : ''
        container.inert = !nextState

        deck.skipTransition = nextState

        if (nextState) {
          const iframe = container.querySelector('iframe')

          try {
            iframe?.contentWindow?.focus()
          } catch {
            iframe?.focus()
          }
        } else {
          window.focus()
        }
      }, 0)
    }

    Object.defineProperties(deck, {
      toggleOverviewView: { enumerable: true, value: toggleOverviewView },
    })

    window.addEventListener('message', (e) => {
      if (e.origin !== window.origin) return
      if (e.data === 'closeOverview') toggleOverviewView(false)
    })

    attachToggleKey(toggleOverviewView)
  }

export default normalView
