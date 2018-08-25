import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeHash from './hash'
import bespokeKeys from './keys'

export default function() {
  bespoke.from(document.getElementById('presentation'), [
    bespokeClasses,
    bespokeKeys,
    bespokeHash({ history: false }),
  ])
}
