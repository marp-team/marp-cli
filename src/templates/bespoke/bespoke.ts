import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeInteractive from './interactive'
import bespokeLoad from './load'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokePresenter from './presenter/'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import { getViewMode, popQuery, setQuery, setViewMode, ViewMode } from './utils'

const pattern = [ViewMode.Normal, ViewMode.Presenter, ViewMode.Next] as const

const parse = (...patterns: [[boolean, boolean, boolean], Function][]) => {
  const idx = pattern.findIndex(v => getViewMode() === v)
  if (idx < 0) throw new Error('Invalid view')

  return patterns.map(([pat, plugin]) => pat[idx] && plugin).filter(p => p)
}

export default function bespokeTemplate(
  target = document.getElementById('p')!
) {
  setViewMode()

  const key = popQuery('sync') || undefined
  const _ = false
  const x = true

  const deck = bespoke.from(
    target,
    parse(
      //   P  N
      [[x, x, _], bespokeSync({ key })],
      [[x, x, x], bespokePresenter(target)],
      [[x, x, _], bespokeInteractive],
      [[x, x, x], bespokeClasses],
      [[x, _, _], bespokeInactive()],
      [[x, x, x], bespokeLoad],
      [[x, x, x], bespokeState({ history: false })],
      [[x, x, _], bespokeNavigation()],
      [[x, x, _], bespokeFullscreen],
      [[x, _, _], bespokeProgress],
      [[x, x, _], bespokeTouch()],
      [[x, _, _], bespokeOSC()],
      [[x, x, x], bespokeFragments]
    )
  )

  window.addEventListener('beforeunload', () =>
    setQuery({ sync: deck.syncKey })
  )
  window.addEventListener('unload', () => deck.destroy())

  return deck
}
