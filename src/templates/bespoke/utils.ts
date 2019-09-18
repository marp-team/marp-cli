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

export const getViewMode = () => {
  switch (document.body.getAttribute(viewAttr)) {
    case ViewMode.Normal:
      return ViewMode.Normal
    case ViewMode.Presenter:
      return ViewMode.Presenter
    case ViewMode.Next:
      return ViewMode.Next
    default:
      throw new Error('View mode is not assigned.')
  }
}

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
