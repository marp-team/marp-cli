export const generateURLfromParams = (
  params: URLSearchParams,
  base: Location = location
) => {
  let query = params.toString()
  if (query) query = `?${query}`

  return `${base.protocol}//${base.host}${base.pathname}${query}${base.hash}`
}

export const readQuery = (name: string) =>
  new URLSearchParams(location.search).get(name)
