import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeFullscreen from './fullscreen'
import bespokeHash from './hash'
import bespokeNavigation from './navigation'
import bespokeOSD from './osd'
import bespokeProgress from './progress'
import bespokeTouch from './touch'

export default function() {
  return bespoke.from(document.getElementById('presentation'), [
    bespokeForms(),
    bespokeClasses,
    bespokeInactive(),
    bespokeHash({ history: false }),
    bespokeNavigation(),
    bespokeFullscreen,
    bespokeProgress,
    bespokeTouch(),
    bespokeOSD(),
  ])
}
