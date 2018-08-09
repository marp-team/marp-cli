import marp from '../src/marp'

describe('Marp CLI', () => {
  it('returns exit code 1', () => expect(marp()).resolves.toBe(1))
})
