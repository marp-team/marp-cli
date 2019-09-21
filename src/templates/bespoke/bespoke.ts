import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeLoad from './load'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import { popQuery, setQuery } from './utils'

export default function(target = document.getElementById('p')!) {
  const key = popQuery('sync') || undefined

  const deck = bespoke.from(target, [
    bespokeForms(),
    bespokeClasses,
    bespokeInactive(),
    bespokeLoad,
    bespokeState({ history: false }),
    bespokeNavigation(),
    bespokeFullscreen,
    bespokeProgress,
    bespokeTouch(),
    bespokeOSC(),
    bespokeFragments,
    bespokeSync({ key }),
  ])

  window.addEventListener('beforeunload', () =>
    setQuery({ sync: deck.syncKey })
  )
  window.addEventListener('unload', () => deck.destroy())

  return deck
}
