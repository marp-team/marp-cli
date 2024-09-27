import path from 'node:path'
import getStdin from 'get-stdin'
import api, { CLIError } from '../src/index'
import * as marpCli from '../src/marp-cli'

const stdinBuffer = getStdin.buffer

afterEach(() => jest.clearAllMocks())

describe('Marp CLI API interface', () => {
  it('runs Marp CLI with specific options', async () => {
    const marpCliSpy = jest.spyOn(marpCli, 'marpCli').mockResolvedValue(0)

    try {
      const ret = await api([], { baseUrl: 'https://example.com/' })

      expect(ret).toBe(0)
      expect(marpCliSpy).toHaveBeenCalled()

      const opts: marpCli.MarpCLIInternalOptions = marpCliSpy.mock.calls[0][1]

      expect(opts.baseUrl).toBe('https://example.com/')
      expect(opts.stdin).toBe(false)
      expect(opts.throwErrorAlways).toBe(true)
    } finally {
      marpCliSpy.mockRestore()
    }
  })

  it('does not read input from stdin if called API', async () => {
    const cliStdout = jest.spyOn(console, 'log').mockImplementation()

    try {
      await marpCli.cliInterface([])
      expect(stdinBuffer).toHaveBeenCalled()
      ;(stdinBuffer as jest.Mock).mockClear()

      await api([])
      expect(stdinBuffer).not.toHaveBeenCalled()
    } finally {
      cliStdout.mockRestore()
    }
  })

  it('always throws error if CLI met an error to suspend', async () => {
    const cliError = jest.spyOn(console, 'error').mockImplementation()

    try {
      const fakePath = path.resolve(__dirname, '__fake')

      expect(await marpCli.cliInterface(['-c', fakePath])).toBeGreaterThan(0)
      await expect(api(['-c', fakePath])).rejects.toBeInstanceOf(CLIError)
    } finally {
      cliError.mockRestore()
    }
  })
})
