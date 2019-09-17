const viewAttr = 'data-bespoke-view'

export enum ViewMode {
  Normal = '',
  Presenter = 'presenter',
  Next = 'next',
}

export const generateURLfromParams = (
  params: URLSearchParams,
  { protocol, host, pathname, hash }: Location = location
) => {
  const q = params.toString()
  return `${protocol}//${host}${pathname}${q ? '?' : ''}${q}${hash}`
}

export const isCurrentView = (...viewModes: ViewMode[]) =>
  viewModes.includes(document.body.getAttribute(viewAttr) as ViewMode)

export const readQuery = (name: string) =>
  new URLSearchParams(location.search).get(name)

export const setViewMode = () =>
  document.body.setAttribute(
    viewAttr,
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
