export const availableFinders = ['chrome', 'edge', 'firefox'] as const

export type FinderName = (typeof availableFinders)[number]

export const defaultFinders = [
  ...availableFinders,
] as const satisfies readonly FinderName[]
