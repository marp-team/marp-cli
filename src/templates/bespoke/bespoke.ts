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
import bespokeTransition from './transition'
import { getViewMode, popQuery, setViewMode, viewModes } from './utils'
import bespokeWakeLock from './wake-lock'

const parse = (
  ...patterns: [
    [normalView: 1 | 0, presnterView: 1 | 0, nextView: 1 | 0],
    (...args: unknown[]) => void,
  ][]
) => {
  const i = viewModes.findIndex((v) => getViewMode() === v)
  return patterns.map(([pat, plugin]) => pat[i] && plugin).filter((p) => p)
}

const bespokeTemplate = (
  target = document.getElementById(':$p')!  
) => {
  setViewMode()

  const key = popQuery('sync') || undefined
  const deck = bespoke.from(
    target,
    parse(
      //   P  N
      [[1, 1, 0], bespokeSync({ key })],
      [[1, 1, 1], bespokePresenter(target)],
      [[1, 1, 0], bespokeInteractive],
      [[1, 1, 1], bespokeClasses],
      [[1, 0, 0], bespokeInactive()],
      [[1, 1, 1], bespokeLoad],
      [[1, 1, 1], bespokeState({ history: false })],
      [[1, 1, 0], bespokeNavigation()],
      [[1, 1, 0], bespokeFullscreen],
      [[1, 0, 0], bespokeProgress],
      [[1, 1, 0], bespokeTouch()],
      [[1, 0, 0], bespokeOSC()],
      [[1, 0, 0], bespokeTransition],
      [[1, 1, 1], bespokeFragments],
      [[1, 1, 0], bespokeWakeLock]
    )
  )

  return deck
}

export default bespokeTemplate
