export const generateURLfromParams = (
  params: URLSearchParams,
  { protocol, host, pathname, hash }: Location = location
) => {
  const q = params.toString()
  return `${protocol}//${host}${pathname}${q ? '?' : ''}${q}${hash}`
}

export const readQuery = (name: string) =>
  new URLSearchParams(location.search).get(name)
