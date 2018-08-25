import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeHash from './hash'
import bespokeNavigation from './navigation'

export default function() {
  bespoke.from(document.getElementById('presentation'), [
    bespokeClasses,
    bespokeHash({ history: false }),
    bespokeNavigation,
  ])
}
