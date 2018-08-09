import MarpCLI from '../src/marp'

describe('Marp CLI', () => {
  it('returns exit code 1', () => expect(MarpCLI()).resolves.toBe(1))
})
