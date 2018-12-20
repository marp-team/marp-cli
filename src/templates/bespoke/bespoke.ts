import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeCursor from './cursor'
import bespokeFullscreen from './fullscreen'
import bespokeHash from './hash'
import bespokeNavigation from './navigation'
import bespokeProgress from './progress'
import bespokeTouch from './touch'

export default function() {
  return bespoke.from(document.getElementById('presentation'), [
    bespokeClasses,
    bespokeCursor(),
    bespokeHash({ history: false }),
    bespokeNavigation(),
    bespokeFullscreen,
    bespokeProgress,
    bespokeTouch(),
  ])
}
