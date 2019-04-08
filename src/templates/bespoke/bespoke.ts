import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeHash from './hash'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokeProgress from './progress'
import bespokeTouch from './touch'

export default function() {
  return bespoke.from(document.getElementById('presentation'), [
    bespokeForms(),
    bespokeClasses,
    bespokeInactive(),
    bespokeHash({ history: false }),
    bespokeNavigation(),
    bespokeFragments,
    bespokeFullscreen,
    bespokeProgress,
    bespokeTouch(),
    bespokeOSC(),
  ])
}
