export function useSpy(
  spies: jest.SpyInstance[],
  func: () => void,
  mock?: boolean
): void

export function useSpy(
  spies: jest.SpyInstance[],
  func: () => Promise<any>,
  mock?: boolean
): Promise<any>

export function useSpy(
  spies: jest.SpyInstance[],
  func: () => any,
  mock = true
) {
  const finallyFunc = (ret?) => {
    spies.forEach(spy => spy.mockRestore())
    return ret
  }

  let funcResult

  try {
    if (mock) spies.forEach(spy => spy.mockImplementation())

    funcResult = func()

    if (funcResult instanceof Promise) {
      return funcResult.then(finallyFunc, err => {
        finallyFunc()
        return Promise.reject(err)
      })
    }
  } finally {
    if (!(funcResult instanceof Promise)) finallyFunc()
  }
}
