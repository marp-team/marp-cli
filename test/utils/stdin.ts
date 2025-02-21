import { Readable } from 'node:stream'
import * as cli from '../../src/cli'
import { getStdin } from '../../src/utils/stdin'

jest.unmock('../../src/utils/stdin')

afterEach(() => jest.restoreAllMocks())

const createMockedStream = (data: string, delay = 0) => {
  const { length } = data

  let cursor = 0

  return new Readable({
    read(size) {
      setTimeout(() => {
        const end = cursor + size

        this.push(data.slice(cursor, end))
        if (length < end) this.push(null)

        cursor = end
      }, delay)
    },
  })
}

const createMockedStdinStream = (
  data: string,
  { delay = 0, isTTY = false }: { delay?: number; isTTY?: boolean } = {}
) =>
  Object.assign(
    createMockedStream(data, delay) as unknown as NodeJS.ReadStream,
    { fd: 0 as const, isTTY }
  )

describe('getStdin()', () => {
  it('always returns empty buffer if stdin is TTY', async () => {
    jest
      .spyOn(process, 'stdin', 'get')
      .mockImplementation(() =>
        createMockedStdinStream('foobar', { isTTY: true })
      )

    const buf = await getStdin()
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf).toHaveLength(0)
    expect(buf.toString()).toBe('')
  })

  it('reads buffer from stdin', async () => {
    jest
      .spyOn(process, 'stdin', 'get')
      .mockImplementation(() => createMockedStdinStream('foobar'))

    const buf = await getStdin()
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf).toHaveLength(6)
    expect(buf.toString()).toBe('foobar')
  })

  it('shows info message 3 seconds after reading stream', async () => {
    jest
      .spyOn(process, 'stdin', 'get')
      .mockImplementation(() =>
        createMockedStdinStream('foobar', { delay: 3210 })
      )

    jest.spyOn(cli, 'info').mockImplementation()

    const buf = await getStdin()
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf).toHaveLength(6)
    expect(buf.toString()).toBe('foobar')

    expect(cli.info).toHaveBeenCalledTimes(1)
    expect(cli.info).toHaveBeenCalledWith(
      expect.stringContaining('Currently waiting data from stdin stream')
    )
  }, 7000)
})
