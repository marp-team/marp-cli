import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeCursor from './cursor'
import bespokeHash from './hash'
import bespokeNavigation from './navigation'
import bespokeProgress from './progress'

export default function() {
  bespoke.from(document.getElementById('presentation'), [
    bespokeClasses,
    bespokeCursor(),
    bespokeHash({ history: false }),
    bespokeNavigation,
    bespokeProgress,
  ])
}
