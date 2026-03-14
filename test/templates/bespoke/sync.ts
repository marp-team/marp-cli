/** @jest-environment jsdom */
import { assertBespokeWithSyncKey } from '../../../src/templates/bespoke/sync'

describe('#assertBespokeWithSyncKey', () => {
  it('returns true for deck with string syncKey', () => {
    expect(assertBespokeWithSyncKey({ syncKey: 'sync-key', foo: 'bar' })).toBe(
      true
    )
  })

  it('throws for deck without valid syncKey', () => {
    expect(() => assertBespokeWithSyncKey({})).toThrow(
      'The current instance of Bespoke.js is incompatible with Marp bespoke sync plugin.'
    )

    // syncKey should be string
    expect(() => assertBespokeWithSyncKey({ syncKey: 123 })).toThrow(
      'The current instance of Bespoke.js is incompatible with Marp bespoke sync plugin.'
    )
  })
})
