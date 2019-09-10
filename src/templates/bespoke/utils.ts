export const readQuery = (name: string) =>
  new URLSearchParams(location.search).get(name)
