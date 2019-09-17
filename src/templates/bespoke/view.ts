import { readQuery } from './utils'

const attr = 'data-bespoke-view'

export enum ViewMode {
  Normal = '',
  Presenter = 'presenter',
  Next = 'next',
}

export const isCurrentView = (viewMode: ViewMode) =>
  document.body.getAttribute(attr) === viewMode

export default function bespokeView() {
  document.body.setAttribute(
    attr,
    ((): ViewMode => {
      switch (readQuery('view')) {
        case 'next':
          return ViewMode.Next
        case 'presenter':
          return ViewMode.Presenter
        default:
          return ViewMode.Normal
      }
    })()
  )

  return () => {}
}
