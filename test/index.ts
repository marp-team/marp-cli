import path from 'path'
import getStdin from 'get-stdin'
import api, { CLIError } from '../src/index'
import * as marpCli from '../src/marp-cli'
import * as puppeteerUtil from '../src/utils/puppeteer'

const stdinBuffer = getStdin.buffer

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('Marp CLI API interface', () => {
  it('runs Marp CLI with specific options', async () => {
    const marpCliSpy = jest.spyOn(marpCli, 'marpCli').mockResolvedValue(0)
    const ret = await api([])

    expect(ret).toBe(0)
    expect(marpCliSpy).toHaveBeenCalled()

    const opts: marpCli.MarpCLIInternalOptions = marpCliSpy.mock.calls[0][1]

    expect(opts.stdin).toBe(false)
    expect(opts.throwErrorAlways).toBe(true)
  })

  it('does not read input from stdin if called API', async () => {
    jest.spyOn(console, 'error').mockImplementation()

    await marpCli.cliInterface([])
    expect(stdinBuffer).toHaveBeenCalled()
    ;(stdinBuffer as jest.Mock).mockClear()

    await api([])
    expect(stdinBuffer).not.toHaveBeenCalled()
  })

  it('always throws error if CLI met an error to suspend', async () => {
    jest.spyOn(console, 'error').mockImplementation()

    const fakePath = path.resolve(__dirname, '__fake')

    expect(await marpCli.cliInterface(['-c', fakePath])).toBeGreaterThan(0)
    await expect(api(['-c', fakePath])).rejects.toBeInstanceOf(CLIError)
  })

  it('resets cached Chrome path every time', async () => {
    const resetExecutablePathSpy = jest.spyOn(
      puppeteerUtil,
      'resetExecutablePath'
    )
    jest.spyOn(marpCli, 'marpCli').mockResolvedValue(0)

    await api([])
    expect(resetExecutablePathSpy).toHaveBeenCalledTimes(1)

    await api([])
    expect(resetExecutablePathSpy).toHaveBeenCalledTimes(2)
  })
})
