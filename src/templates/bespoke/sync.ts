import nanoid from 'nanoid'
import { FragmentEvent } from './fragments'

export interface BespokeSyncOption {
  key?: string
}

export interface BespokeSyncState {
  reference: number
  index: number
  fragmentIndex: number
}

export default function bespokeSync(opts: BespokeSyncOption = {}) {
  const key = opts.key || nanoid()
  const storageKey = `bespoke-marp-sync-${key}`

  const getState = (): Partial<BespokeSyncState> => {
    const stateJSON = localStorage.getItem(storageKey)
    if (!stateJSON) return Object.create(null)

    return JSON.parse(stateJSON)
  }

  const setState = (
    updater:
      | Partial<BespokeSyncState>
      | ((prevState: Partial<BespokeSyncState>) => Partial<BespokeSyncState>)
  ) => {
    const updaterFunc = typeof updater === 'function' ? updater : () => updater
    const currentState = getState()
    const newState = { ...currentState, ...updaterFunc(currentState) }

    localStorage.setItem(storageKey, JSON.stringify(newState))
    return newState
  }

  // Initialize or increase reference count
  setState(prev => ({ reference: (prev.reference || 0) + 1 }))

  return deck => {
    Object.defineProperty(deck, 'syncKey', {
      value: key,
      enumerable: true,
    })

    // Update storage value to store current page and fragment index
    // (Wrap by setTimeout to skip fragment event for initialization)
    setTimeout(() => {
      deck.on('fragment', (e: FragmentEvent) => {
        setState({ index: e.index, fragmentIndex: e.fragmentIndex })
      })
    }, 0)

    // Listen "storage" event
    window.addEventListener('storage', e => {
      if (e.key === storageKey && e.oldValue && e.newValue) {
        const prev: Partial<BespokeSyncState> = JSON.parse(e.oldValue)
        const current: Partial<BespokeSyncState> = JSON.parse(e.newValue)

        if (
          prev.index !== current.index ||
          prev.fragmentIndex !== current.fragmentIndex
        ) {
          deck.slide(current.index, { fragment: current.fragmentIndex })
        }
      }
    })

    deck.on('destroy', () => {
      const { reference } = getState()

      if (reference === undefined || reference <= 1) {
        localStorage.removeItem(storageKey)
      } else {
        setState({ reference: reference - 1 })
      }
    })
  }
}
