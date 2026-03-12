import {
  getViewMode,
  ViewModeNormal,
  ViewModeOverview,
  ViewModePresenter,
} from '../utils'
import normalView from './normal-view'
import overviewView from './overview-view'

const bespokeOverview = () => {
  const mode = getViewMode()

  return {
    [ViewModeNormal]: normalView,
    [ViewModePresenter]: normalView,
    [ViewModeOverview]: overviewView(),
  }[mode]
}

export default bespokeOverview
