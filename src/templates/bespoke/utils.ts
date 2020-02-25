type LocationLike = Pick<
  Location,
  'protocol' | 'host' | 'pathname' | 'hash' | 'search'
>
type QuerySetter = (...args: Parameters<History['pushState']>) => void

const replacer: QuerySetter = (...args) => history.replaceState(...args)
const viewAttr = 'data-bespoke-view'

export enum ViewMode {
  Normal = '',
  Presenter = 'presenter',
  Next = 'next',
}

export const generateURLfromParams = (
  params: URLSearchParams,
  { protocol, host, pathname, hash }: LocationLike = location
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

export const popQuery = (name: string) => {
  const value = readQuery(name)
  setQuery({ [name]: undefined })

  return value
}

export const setQuery = (
  queries: Record<string, string | false | null | undefined>,
  opts: { location?: LocationLike; setter?: QuerySetter } = {}
) => {
  const options = { location, setter: replacer, ...opts }
  const params = new URLSearchParams(options.location.search)

  for (const k of Object.keys(queries)) {
    const value = queries[k]

    if (typeof value === 'string') {
      params.set(k, value)
    } else {
      params.delete(k)
    }
  }

  try {
    options.setter(
      null,
      document.title,
      generateURLfromParams(params, options.location)
    )
  } catch (e) {
    // Safari may throw SecurityError by replacing state 100 times per 30 seconds.
    console.error(e)
  }
}

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

export const storage = (() => {
  const available = (() => {
    try {
      localStorage.setItem('bespoke-marp', 'bespoke-marp')
      localStorage.removeItem('bespoke-marp')

      return true
    } catch (e) {
      console.warn(
        'Warning: Using localStorage is restricted in the current host so some features may not work.'
      )
      return false
    }
  })()

  return {
    available,
    get: (key: string): string | null => {
      try {
        return localStorage.getItem(key)
      } catch (e) {
        return null
      }
    },
    set: (key: string, value: string): boolean => {
      try {
        localStorage.setItem(key, value)
        return true
      } catch (e) {
        return false
      }
    },
    remove: (key: string): boolean => {
      try {
        localStorage.removeItem(key)
        return true
      } catch (e) {
        return false
      }
    },
  }
})()
