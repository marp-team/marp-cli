import { cliPrepare, defaultDebug } from '../src/prepare'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Prepare for CLI interface', () => {
  it('parses argv and return normalized result', () => {
    const argv = ['node', 'marp-cli.js', '--pdf', 'test.md']
    jest.replaceProperty(process, 'argv', argv)

    expect(cliPrepare()).toStrictEqual({
      args: ['--pdf', 'test.md'],
      debug: false,
    })
  })

  it('allows passing arguments', () => {
    const args = ['--pdf', 'test.md']
    expect(cliPrepare(args)).toStrictEqual({ args, debug: false })
  })

  describe('Debug', () => {
    it('parses --debug option', () => {
      expect(cliPrepare(['--debug'])).toStrictEqual({
        args: [],
        debug: defaultDebug,
      })
      expect(cliPrepare(['--pdf', '--debug'])).toStrictEqual({
        args: ['--pdf'],
        debug: defaultDebug,
      })
      expect(cliPrepare(['--debug', '--pptx'])).toStrictEqual({
        args: ['--pptx'],
        debug: defaultDebug,
      })
    })

    it('parses -d option', () => {
      expect(cliPrepare(['-d'])).toStrictEqual({
        args: [],
        debug: defaultDebug,
      })
      expect(cliPrepare(['-d', '-w'])).toStrictEqual({
        args: ['-w'],
        debug: defaultDebug,
      })
      expect(cliPrepare(['-s', '-d'])).toStrictEqual({
        args: ['-s'],
        debug: defaultDebug,
      })
    })

    it('parses debug option with filter', () => {
      // --debug
      expect(cliPrepare(['--debug', 'filter'])).toStrictEqual({
        args: [],
        debug: 'filter',
      })
      expect(cliPrepare(['--server', '--debug', 'a', 'b'])).toStrictEqual({
        args: ['--server', 'b'],
        debug: 'a',
      })
      expect(cliPrepare(['--debug=a=b'])).toStrictEqual({
        args: [],
        debug: 'a=b',
      })
      expect(cliPrepare(['--watch', '--debug=a', 'b'])).toStrictEqual({
        args: ['--watch', 'b'],
        debug: 'a',
      })

      // -d
      expect(cliPrepare(['-d', 'filter'])).toStrictEqual({
        args: [],
        debug: 'filter',
      })
      expect(cliPrepare(['-s', '-d', 'a', 'b'])).toStrictEqual({
        args: ['-s', 'b'],
        debug: 'a',
      })
      expect(cliPrepare(['-d=  e:* '])).toStrictEqual({
        args: [],
        debug: 'e:*',
      })
      expect(cliPrepare(['-w', '-d=a', 'b'])).toStrictEqual({
        args: ['-w', 'b'],
        debug: 'a',
      })

      // Fallback to default
      expect(cliPrepare(['--debug='])).toStrictEqual({
        args: [],
        debug: defaultDebug,
      })
      expect(cliPrepare(['-d='])).toStrictEqual({
        args: [],
        debug: defaultDebug,
      })

      // Case sensitive
      expect(cliPrepare(['-D'])).toStrictEqual({
        args: ['-D'],
        debug: false,
      })
      expect(cliPrepare(['--DEBUG'])).toStrictEqual({
        args: ['--DEBUG'],
        debug: false,
      })
      expect(cliPrepare(['-D=abc'])).toStrictEqual({
        args: ['-D=abc'],
        debug: false,
      })
      expect(cliPrepare(['--DEBUG=abc'])).toStrictEqual({
        args: ['--DEBUG=abc'],
        debug: false,
      })

      // Arguments should be splitted into each array element
      expect(cliPrepare(['--debug foo'])).toStrictEqual({
        args: ['--debug foo'],
        debug: false,
      })
      expect(cliPrepare(['-d foo'])).toStrictEqual({
        args: ['-d foo'],
        debug: false,
      })

      // Keywords
      expect(cliPrepare(['a', '--debug=true', 'b'])).toStrictEqual({
        args: ['a', 'b'],
        debug: defaultDebug,
      })
      expect(cliPrepare(['c', '--debug', '1'])).toStrictEqual({
        args: ['c'],
        debug: defaultDebug,
      })
      expect(cliPrepare(['a', '--debug=0', 'b'])).toStrictEqual({
        args: ['a', 'b'],
        debug: false,
      })
      expect(cliPrepare(['c', '--debug', '0'])).toStrictEqual({
        args: ['c'],
        debug: false,
      })
      expect(cliPrepare(['a', '--debug=all', 'b'])).toStrictEqual({
        args: ['a', 'b'],
        debug: '*',
      })
      expect(cliPrepare(['c', '--debug', 'full'])).toStrictEqual({
        args: ['c'],
        debug: '*',
      })
    })
  })
})
