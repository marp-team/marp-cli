type MemoizedPromiseAllowedValue = NonNullable<unknown> | null

export interface MemoizedPromiseContext<T extends MemoizedPromiseAllowedValue> {
  value: Promise<T> | T | undefined
  init: (initializer: () => T | Promise<T>) => Promise<T>
}

export const createMemoizedPromiseContext = <
  T extends MemoizedPromiseAllowedValue,
>(): MemoizedPromiseContext<T> => {
  const ctx: MemoizedPromiseContext<T> = {
    value: undefined,
    init: async (initializer) =>
      await (ctx.value ??= Promise.resolve(initializer()).then(
        (v) => (ctx.value = v)
      )),
  }

  return ctx
}
