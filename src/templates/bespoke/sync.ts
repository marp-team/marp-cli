import { FragmentEvent } from './fragments'
import { storage, setHistoryState } from './utils'

export interface BespokeSyncOption {
  key?: string
}

export interface BespokeSyncState {
  reference: number
  index: number
  fragmentIndex: number
}

export default function bespokeSync(opts: BespokeSyncOption = {}) {
  const key =
    opts.key ||
    window.history.state?.marpBespokeSyncKey ||
    Math.random().toString(36).slice(2)

  const storageKey = `bespoke-marp-sync-${key}`

  setHistoryState({ marpBespokeSyncKey: key })

  const getState = (): Partial<BespokeSyncState> => {
    const stateJSON = storage.get(storageKey)
    if (!stateJSON) return Object.create(null)

    return JSON.parse(stateJSON)
  }

  const setState = (
    updater: (prevState: Partial<BespokeSyncState>) => Partial<BespokeSyncState>
  ) => {
    const currentState = getState()
    const newState = { ...currentState, ...updater(currentState) }

    storage.set(storageKey, JSON.stringify(newState))
    return newState
  }

  const initialize = () =>
    setState((prev) => ({ reference: (prev.reference || 0) + 1 }))

  return (deck) => {
    initialize()

    Object.defineProperty(deck, 'syncKey', {
      value: key,
      enumerable: true,
    })

    // Update storage value to store current page and fragment index
    // (Wrap by setTimeout to skip fragment event for initialization)
    let updateFragment = true

    setTimeout(() => {
      deck.on('fragment', (e: FragmentEvent) => {
        if (updateFragment)
          setState(() => ({ index: e.index, fragmentIndex: e.fragmentIndex }))
      })
    }, 0)

    // Listen "storage" event
    window.addEventListener('storage', (e) => {
      if (e.key === storageKey && e.oldValue && e.newValue) {
        const prev: Partial<BespokeSyncState> = JSON.parse(e.oldValue)
        const current: Partial<BespokeSyncState> = JSON.parse(e.newValue)

        if (
          prev.index !== current.index ||
          prev.fragmentIndex !== current.fragmentIndex
        ) {
          try {
            updateFragment = false
            deck.slide(current.index, { fragment: current.fragmentIndex })
          } finally {
            updateFragment = true
          }
        }
      }
    })

    const destructor = () => {
      const { reference } = getState()

      if (reference === undefined || reference <= 1) {
        storage.remove(storageKey)
      } else {
        setState(() => ({ reference: reference - 1 }))
      }
    }

    deck.on('destroy', destructor)

    window.addEventListener('pagehide', (e) => {
      if (e.persisted) {
        window.removeEventListener('pageshow', initialize)
        window.addEventListener('pageshow', initialize)
      }
      destructor()
    })
  }
}
