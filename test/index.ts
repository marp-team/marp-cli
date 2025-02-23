import path from 'node:path'
import api, { CLIError } from '../src/index'
import * as marpCli from '../src/marp-cli'
import * as stdin from '../src/utils/stdin'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Marp CLI API interface', () => {
  it('runs Marp CLI with specific options', async () => {
    const marpCliSpy = jest.spyOn(marpCli, 'marpCli').mockResolvedValue(0)

    const ret = await api([], { baseUrl: 'https://example.com/' })

    expect(ret).toBe(0)
    expect(marpCliSpy).toHaveBeenCalled()

    const opts: marpCli.MarpCLIOptions = marpCliSpy.mock.calls[0][1]

    expect(opts.baseUrl).toBe('https://example.com/')
    expect(opts.stdin).toBe(false)
    expect(opts.throwErrorAlways).toBe(true)
  })

  it('does not read input from stdin if called API', async () => {
    jest.spyOn(console, 'log').mockImplementation()

    const stdinBuffer = jest.spyOn(stdin, 'getStdin')

    await marpCli.cliInterface([])
    expect(stdinBuffer).toHaveBeenCalled()

    stdinBuffer.mockClear()
    await api([])
    expect(stdinBuffer).not.toHaveBeenCalled()
  })

  it('always throws error if CLI met an error to suspend', async () => {
    jest.spyOn(console, 'error').mockImplementation()

    const fakePath = path.resolve(__dirname, '__fake')

    expect(await marpCli.cliInterface(['-c', fakePath])).toBeGreaterThan(0)
    await expect(api(['-c', fakePath])).rejects.toBeInstanceOf(CLIError)
  })

  it('always throws error if CLI has failed to parse options', async () => {
    jest.spyOn(console, 'error').mockImplementation()

    expect(await marpCli.cliInterface(['--image', 'unknown'])).toBeGreaterThan(
      0
    )
    await expect(api(['--image', 'unknown'])).rejects.toBeInstanceOf(CLIError)
  })
})
