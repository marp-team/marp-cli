import marpCli from '../src/marp-cli'

describe('Marp CLI', () => {
  it('returns exit code 1', () => expect(marpCli()).resolves.toBe(1))
})
