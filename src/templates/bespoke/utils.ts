type LocationLike = Pick<
  Location,
  'protocol' | 'host' | 'pathname' | 'hash' | 'search'
>
type QuerySetter = (...args: Parameters<History['pushState']>) => void

const body = document.body

const replacer: QuerySetter = (...args) => history.replaceState(...args)

export const ViewModeNormal = ''
export const ViewModePresenter = 'presenter'
export const ViewModeNext = 'next'

export const viewModes = [
  ViewModeNormal,
  ViewModePresenter,
  ViewModeNext,
] as const

export const classPrefix = 'bespoke-marp-'
export const dataAttrPrefix = `data-${classPrefix}` as const

export const generateURLfromParams = (
  params: URLSearchParams,
  { protocol, host, pathname, hash }: LocationLike = location
) => {
  const q = params.toString()
  return `${protocol}//${host}${pathname}${q ? '?' : ''}${q}${hash}`
}

export const getViewMode = () =>
  body.dataset.bespokeView as typeof viewModes[number]

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
      { ...(window.history.state ?? {}) },
      '',
      generateURLfromParams(params, options.location)
    )
  } catch (e) {
    // Safari may throw SecurityError by replacing state 100 times per 30 seconds.
    console.error(e)
  }
}

export const setHistoryState = (state: Record<string, any>) =>
  setQuery({}, { setter: (s, ...r) => replacer({ ...s, ...state }, ...r) })

export const setViewMode = () => {
  const view = readQuery('view')

  body.dataset.bespokeView =
    view === ViewModeNext || view === ViewModePresenter ? view : ViewModeNormal
}

export const storage = (() => {
  const available = (() => {
    const key = 'bespoke-marp' as const

    try {
      localStorage.setItem(key, key)
      localStorage.removeItem(key)

      return true
    } catch (e) {
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

export const toggleAriaHidden = (element: HTMLElement, value: boolean) => {
  const key = 'aria-hidden' as const

  if (value) {
    element.setAttribute(key, 'true')
  } else {
    element.removeAttribute(key)
  }
}
