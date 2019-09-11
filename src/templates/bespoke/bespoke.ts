import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
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

export default function(target = document.getElementById('presentation')!) {
  window.addEventListener('load', () => document.body.classList.add('loaded'))

  const deck = bespoke.from(target, [
    bespokeForms(),
    bespokeClasses,
    bespokeInactive(),
    bespokeState({ history: false }),
    bespokeNavigation(),
    bespokeFullscreen,
    bespokeProgress,
    bespokeTouch(),
    bespokeOSC(),
    bespokeFragments,
    bespokeSync({ key: readQuery('sync') || undefined }),
    bespokePresenter(),
  ])

  window.addEventListener('unload', () => deck.destroy())

  return deck
}
