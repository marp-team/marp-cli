import {
  getViewMode,
  ViewModeNext,
  ViewModeNormal,
  ViewModePresenter,
} from '../utils'
import nextView from './next-view'
import normalView from './normal-view'
import presenterView from './presenter-view'

const bespokePresenter = (target: HTMLElement) => {
  const mode = getViewMode()

  // Append blank slide to next view
  if (mode === ViewModeNext) target.appendChild(document.createElement('span'))

  return {
    [ViewModeNormal]: normalView,
    [ViewModePresenter]: presenterView,
    [ViewModeNext]: nextView,
  }[mode]
}

export default bespokePresenter
