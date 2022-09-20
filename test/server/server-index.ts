/** @jest-environment jsdom */
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

    index = document.getElementById('index') as HTMLUListElement
    showAll = document.getElementById('show-all') as HTMLInputElement
  })

  const checkShowAll = (state: boolean) => {
    showAll.checked = state
    showAll.dispatchEvent(new Event('change', {}))
  }

  describe('when check state of #show-all is changed', () => {
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

    describe('when sessionStorage reached to quota limit', () => {
      it('logs error but class is applied', () => {
        const error = jest.spyOn(console, 'error').mockImplementation()
        const exception = new DOMException('test', 'QuotaExceededError')

        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw exception
        })

        expect(() => checkShowAll(true)).not.toThrow()
        expect(error).toHaveBeenCalledWith(exception)
        expect(index.classList.contains('show-all')).toBe(true)
      })
    })
  })

  describe('when sessionStorage has a stored state', () => {
    it('applies checked state', () => {
      sessionStorage.setItem(showAllKey, '1')
      serverIndex()

      expect(showAll.checked).toBe(true)
      expect(index.classList.contains('show-all')).toBe(true)
    })
  })
})
