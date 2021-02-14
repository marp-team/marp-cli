import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeInactive from './inactive'
import bespokeInteractive from './interactive'
import bespokeLoad from './load'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokePresenter from './presenter/'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import { getViewMode, popQuery, setViewMode, ViewMode } from './utils'
import bespokeWakeLock from './wake-lock'

const parse = (
  ...patterns: [
    [normalView: boolean, presnterView: boolean, nextView: boolean],
    (...args: unknown[]) => void
  ][]
) => {
  const idx = [ViewMode.Normal, ViewMode.Presenter, ViewMode.Next].findIndex(
    (v) => getViewMode() === v
  )
  if (idx < 0) throw new Error('Invalid view')

  return patterns.map(([pat, plugin]) => pat[idx] && plugin).filter((p) => p)
}

export default function bespokeTemplate(
  target = document.getElementById('p')! // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
      [[x, x, x], bespokeFragments],
      [[x, x, _], bespokeWakeLock]
    )
  )

  return deck
}
