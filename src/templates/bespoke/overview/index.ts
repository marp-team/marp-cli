import {
  getViewMode,
  ViewModeNormal,
  ViewModePresenter,
  ViewModeOverview,
} from '../utils'
import normalView from './normal-view'
import overviewView from './overview-view'

const bespokeOverview = () => {
  const mode = getViewMode()

  return {
    [ViewModeNormal]: normalView(),
    [ViewModePresenter]: normalView({ closeOnSelect: false }),
    [ViewModeOverview]: overviewView,
  }[mode]
}

export default bespokeOverview
