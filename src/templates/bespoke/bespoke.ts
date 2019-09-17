import bespoke from 'bespoke'
import bespokeForms from 'bespoke-forms'
import bespokeClasses from './classes'
import bespokeInactive from './inactive'
import bespokeLoad from './load'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokePresenter, { bespokePresenterPreprocess } from './presenter'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import { isCurrentView, readQuery, setViewMode, ViewMode } from './utils'

export default function(target = document.getElementById('p')!) {
  setViewMode()
  bespokePresenterPreprocess(target)

  const normalView = isCurrentView(ViewMode.Normal)
  const regularView = isCurrentView(ViewMode.Normal, ViewMode.Presenter)

  const deck = bespoke.from(
    target,
    [
      regularView && bespokeSync({ key: readQuery('sync') || undefined }),
      bespokePresenter(),
      bespokeForms(),
      bespokeClasses,
      normalView && bespokeInactive(),
      bespokeLoad,
      bespokeState({ history: false }),
      regularView && bespokeNavigation(),
      regularView && bespokeFullscreen,
      normalView && bespokeProgress,
      regularView && bespokeTouch(),
      normalView && bespokeOSC(),
      bespokeFragments,
    ].filter(p => p)
  )

  window.addEventListener('unload', () => deck.destroy())
  return deck
}
