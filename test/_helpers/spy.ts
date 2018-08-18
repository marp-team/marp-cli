export function useSpy(
  spies: jest.SpyInstance[],
  func: Function,
  mock: boolean = true
): void {
  try {
    if (mock) spies.forEach(spy => spy.mockImplementation())
    func()
  } finally {
    spies.forEach(spy => spy.mockRestore())
  }
}
