import * as childProcess from 'node:child_process'
import EventEmitter from 'node:events'
import * as cli from '../../src/cli'
import { SOffice } from '../../src/soffice/soffice'
import * as wsl from '../../src/utils/wsl'

const defaultSpawnSetting = { code: 0, delay: 50 }
const spawnSetting = { ...defaultSpawnSetting }

jest.mock('node:child_process', () => ({
  ...jest.requireActual('node:child_process'),
  spawn: jest.fn(),
}))

beforeEach(() => {
  jest.spyOn(childProcess, 'spawn').mockImplementation((): any => {
    const mockedChildProcess = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    })

    setTimeout(() => {
      mockedChildProcess.stdout.emit('data', Buffer.from('mocked stdout'))
    }, 100)

    setTimeout(() => {
      if (spawnSetting.code !== 0) {
        mockedChildProcess.stderr.emit('data', Buffer.from('mocked stderr'))
      }
      mockedChildProcess.emit('close', spawnSetting.code)
    }, spawnSetting.delay)

    return mockedChildProcess
  })

  spawnSetting.code = defaultSpawnSetting.code
  spawnSetting.delay = defaultSpawnSetting.delay
})

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('SOffice class', () => {
  describe('#spawn', () => {
    it('spawns soffice with specified args', async () => {
      const spawnSpy = jest.spyOn(childProcess, 'spawn')
      const soffice = new SOffice()
      await soffice.spawn(['--help'])

      expect(spawnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--help']),
        { stdio: 'pipe' }
      )
    })

    it('throws error if soffice exits with non-zero code', async () => {
      spawnSetting.code = 123

      jest.spyOn(cli, 'error').mockImplementation()

      const spawnSpy = jest.spyOn(childProcess, 'spawn')
      const soffice = new SOffice()
      await expect(() => soffice.spawn(['--help'])).rejects.toThrow(
        'soffice exited with code 123.'
      )

      expect(spawnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--help']),
        { stdio: 'pipe' }
      )
    })

    it('spawns soffice in serial even if run the method multi times in parallel', async () => {
      spawnSetting.delay = 300

      const finishedTimes: number[] = []
      const soffice = new SOffice()

      await Promise.all([
        soffice.spawn(['--help']).then(() => finishedTimes.push(Date.now())),
        soffice.spawn(['-h']).then(() => finishedTimes.push(Date.now())),
      ])

      expect(finishedTimes).toHaveLength(2)
      expect(
        Math.abs(finishedTimes[1] - finishedTimes[0])
      ).toBeGreaterThanOrEqual(spawnSetting.delay - 10)
    })
  })

  describe('private #binaryInWSLHost', () => {
    it('always returns false if the current environment is not WSL', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)

      const soffice: any = new SOffice({
        path: '/mnt/c/Program Files/LibreOffice/program/soffice.exe',
      })

      expect(await soffice.binaryInWSLHost()).toBe(false)
    })

    it('returns true if the current environment is WSL and the browser path is located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      const soffice: any = new SOffice({
        path: '/mnt/c/Program Files/LibreOffice/program/soffice.exe',
      })

      expect(await soffice.binaryInWSLHost()).toBe(true)
    })

    it('returns false if the current environment is WSL and the browser path is not located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      const soffice: any = new SOffice({
        path: '/usr/lib/libreoffice/program/libreoffice',
      })

      expect(await soffice.binaryInWSLHost()).toBe(false)
    })
  })
})
