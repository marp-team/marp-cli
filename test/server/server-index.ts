/** @jest-environment jsdom-fifteen */
// TODO: Use Jest built-in jsdom environment if https://github.com/jsdom/jsdom/issues/2961 was fixed
import serverIndex, { showAllKey } from '../../src/server/server-index'

afterEach(() => jest.restoreAllMocks())

describe('JavaScript for server index', () => {
  let index: HTMLUListElement
  let showAll: HTMLInputElement

  beforeEach(() => {
    document.body.innerHTML = `
      <input type="checkbox" id="show-all" />
      <ul id="index"></ul>
    `.trim()

    index = <HTMLUListElement>document.getElementById('index')
    showAll = <HTMLInputElement>document.getElementById('show-all')
  })

  const checkShowAll = (state: boolean) => {
    showAll.checked = state
    showAll.dispatchEvent(new Event('change', {}))
  }

  context('when check state of #show-all is changed', () => {
    beforeEach(() => serverIndex())

    it('toggles .show-all class to #index list', () => {
      checkShowAll(true)
      expect(index.classList.contains('show-all')).toBe(true)

      checkShowAll(false)
      expect(index.classList.contains('show-all')).toBe(false)
    })

    it('stores checked state to sessionStorage', () => {
      checkShowAll(true)
      expect(sessionStorage.getItem(showAllKey)).toBeTruthy()

      checkShowAll(false)
      expect(sessionStorage.getItem(showAllKey)).toBeFalsy()
    })

    context('when sessionStorage reached to quota limit', () => {
      it('logs error but class is applied', () => {
        const error = jest.spyOn(console, 'error').mockImplementation()
        const exception = new DOMException('test', 'QuotaExceededError')

        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw exception
        })

        expect(() => checkShowAll(true)).not.toThrow()
        expect(error).toBeCalledWith(exception)
        expect(index.classList.contains('show-all')).toBe(true)
      })
    })
  })

  context('when sessionStorage has a stored state', () => {
    it('applies checked state', () => {
      sessionStorage.setItem(showAllKey, '1')
      serverIndex()

      expect(showAll.checked).toBe(true)
      expect(index.classList.contains('show-all')).toBe(true)
    })
  })
})
