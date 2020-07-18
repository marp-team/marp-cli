import path from 'path'
import { Marpit } from '@marp-team/marpit'
import { ThemeSet } from '../src/theme'

afterEach(() => jest.restoreAllMocks())

describe('ThemeSet', () => {
  const themeDir = path.resolve(__dirname, '_files/themes')
  const themeA = path.resolve(themeDir, './a.css')

  describe('.initialize', () => {
    it('creates ThemeSet instance with initial loading', async () => {
      const themeSet = await ThemeSet.initialize([themeDir])

      expect(themeSet.fn).toStrictEqual([themeDir])
      expect(themeSet.fnForWatch).toContain(themeDir)
      expect(themeSet.fnForWatch).toHaveLength(4) // dir + files

      // Themes
      expect(themeSet.themes.size).toBe(3)
      for (const theme of themeSet.themes.values())
        expect(theme.css.length).toBeGreaterThan(0)
    })
  })

  describe('#findPath', () => {
    it('returns the result of findings from original paths', async () => {
      const themeSet = await ThemeSet.initialize([themeDir])
      const found = await themeSet.findPath()

      expect(found).toHaveLength(3)
      for (const fn of found) expect(fn).toMatch(/\.css$/)
    })
  })

  describe('#load', () => {
    context('with new file', () => {
      it('loads theme and add to theme set', async () => {
        const themeSet = await ThemeSet.initialize([])
        expect(themeSet.themes.size).toBe(0)

        await themeSet.load(themeA)
        expect(themeSet.themes.size).toBe(1)
      })
    })

    context('with already registered file', () => {
      it('reloads theme by Theme#load', async () => {
        const themeSet = await ThemeSet.initialize([themeA])
        expect(themeSet.themes.size).toBe(1)

        const [themeInstance] = [...themeSet.themes.values()]
        const load = jest
          .spyOn<any, any>(themeInstance, 'load')
          .mockResolvedValue(0)

        await themeSet.load(themeA)
        expect(themeSet.themes.size).toBe(1)
        expect(load).toHaveBeenCalledTimes(1)
      })

      context('when theme has resolved name', () => {
        it('triggers onThemeUpdated event to observed markdown files', async () => {
          const themeSet = await ThemeSet.initialize([themeA])
          themeSet.registerTo(new Marpit())

          themeSet.onThemeUpdated = jest.fn()
          themeSet.observe('testA.md', 'a')
          themeSet.observe('testA2.md', 'a')
          themeSet.observe('testB.md', 'b')

          await themeSet.load(themeA)
          expect(themeSet.onThemeUpdated).toHaveBeenCalledTimes(2)
          expect(themeSet.onThemeUpdated).toHaveBeenCalledWith('testA.md')
          expect(themeSet.onThemeUpdated).toHaveBeenCalledWith('testA2.md')

          // It does no longer trigger after #unobserve
          ;(<jest.Mock>themeSet.onThemeUpdated).mockClear()
          themeSet.unobserve('testA.md')

          await themeSet.load(themeA)
          expect(themeSet.onThemeUpdated).toHaveBeenCalledTimes(1)
          expect(themeSet.onThemeUpdated).toHaveBeenCalledWith('testA2.md')
          expect(themeSet.onThemeUpdated).not.toHaveBeenCalledWith('testA.md')
        })
      })
    })
  })

  describe('#registerTo', () => {
    it('registers theme to specified Marpit engine', async () => {
      const themeSet = await ThemeSet.initialize([themeDir])
      const marpit = new Marpit()

      themeSet.registerTo(marpit)
      expect(marpit.themeSet.has('a')).toBe(true)
      expect(marpit.themeSet.has('b')).toBe(true)
      expect(marpit.themeSet.has('c')).toBe(true)

      // Reflects parsed theme name back to own themes
      const names = [...themeSet.themes.values()].map((t) => t.name)
      expect(names).toContain('a')
      expect(names).toContain('b')
      expect(names).toContain('c')
    })

    context('when registered theme is not compatible to Marpit engine', () => {
      const emptyCSS = path.resolve(__dirname, '_files/themes/empty')

      it('outputs warning and ignores registration', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation()
        const themeSet = await ThemeSet.initialize([emptyCSS])
        const marpit = new Marpit()

        themeSet.registerTo(marpit)

        expect(marpit.themeSet.size).toBe(0)
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('Cannot register theme CSS')
        )
      })
    })
  })
})
