import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeLoad from './load'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokePresenter from './presenter'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import { readQuery } from './utils'

export default function(target = document.getElementById('p')!) {
  const deck = bespoke.from(target, [
    bespokeSync({ key: readQuery('sync') || undefined }),
    bespokePresenter(),
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
  ])

  window.addEventListener('unload', () => deck.destroy())
  return deck
}
