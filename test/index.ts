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
    const args: Parameters<typeof api> = [
      [],
      { baseUrl: 'https://example.com/' },
    ]

    const mockApiInterface = jest.fn().mockResolvedValue(0)

    await jest.isolateModulesAsync(async () => {
      jest.doMock('../src/marp-cli', () => ({
        ...jest.requireActual('../src/marp-cli'),
        apiInterface: mockApiInterface,
      }))

      const { default: isolatedApi } = await import('../src/index')
      const ret = await isolatedApi(...args)

      expect(ret).toBe(0)
    })

    expect(mockApiInterface).toHaveBeenCalledWith(...args)
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
