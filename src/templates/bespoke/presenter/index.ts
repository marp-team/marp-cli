import { getViewMode, ViewMode } from '../utils'
import nextView from './next-view'
import normalView from './normal-view'
import presenterView from './presenter-view'

export default function bespokePresenter(target: HTMLElement) {
  const mode = getViewMode()

  // Append blank slide to next view
  if (mode === ViewMode.Next) target.appendChild(document.createElement('span'))

  return deck => {
    if (mode === ViewMode.Normal) normalView(deck)
    if (mode === ViewMode.Presenter) presenterView(deck)
    if (mode === ViewMode.Next) nextView(deck)
  }
}
