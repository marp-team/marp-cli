/** @jest-environment jsdom-fifteen */
// TODO: Use Jest built-in jsdom environment if https://github.com/jsdom/jsdom/issues/2961 was fixed
import Marp from '@marp-team/marp-core'
import { Element as MarpitElement } from '@marp-team/marpit'
import { default as screenfull, Screenfull } from 'screenfull'
import { Key } from 'ts-keycode-enum'
import bespoke from '../../src/templates/bespoke/bespoke'
import { classes } from '../../src/templates/bespoke/presenter/presenter-view'
import { _clearCachedWakeLockApi } from '../../src/templates/bespoke/wake-lock'

jest.mock('screenfull')
jest.useFakeTimers()

beforeAll(() => {
  ;(global as any).origin = 'null'
})

afterEach(() => {
  window.dispatchEvent(new Event('unload'))
  jest.restoreAllMocks()
  jest.clearAllTimers()
})

describe("Bespoke template's browser context", () => {
  const marp = new Marp({
    container: new MarpitElement('div', { id: 'p' }),
    html: true,
  })

  const defaultMarkdown = '# 1\n\n---\n\n## 2\n\n---\n\n### 3'

  const render = (
    md = defaultMarkdown,
    targetDocument = document
  ): HTMLElement => {
    let { html, comments } = marp.render(md) // eslint-disable-line prefer-const

    comments.forEach((c, i) => {
      if (c.length > 0)
        html = `${html}<div class="bespoke-marp-note" data-index="${i}"><p>${c.join(
          '\n\n'
        )}</p></div>`
    })

    targetDocument.body.innerHTML = html
    return targetDocument.getElementById('p')! // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  const replaceLocation = <T extends void | Promise<void>>(
    path: string,
    action: () => T
  ): T => {
    const { title } = document
    const { href } = location

    history.replaceState(null, title, path)

    try {
      return action()
    } finally {
      history.replaceState(null, title, href)
    }
  }

  const keydown = (opts, target: EventTarget = document) =>
    target.dispatchEvent(new KeyboardEvent('keydown', opts))

  describe('Classes', () => {
    it('adds bespoke classes to #p', () => {
      const parent = render()
      const deck = bespoke()
      expect(parent.classList.contains('bespoke-marp-parent')).toBe(true)

      const slides = parent.querySelectorAll('.bespoke-marp-slide')
      expect(slides).toHaveLength(3)
      expect(slides[0].classList.contains('bespoke-marp-active')).toBe(true)

      // a11y
      expect(slides[0].hasAttribute('aria-hidden')).toBe(false)
      expect(slides[1].getAttribute('aria-hidden')).toBe('true')
      expect(slides[2].getAttribute('aria-hidden')).toBe('true')

      // Navigate slide
      deck.next()
      expect(slides[0].classList.contains('bespoke-marp-active')).toBe(false)
      expect(slides[1].classList.contains('bespoke-marp-active')).toBe(true)
      expect(slides[0].getAttribute('aria-hidden')).toBe('true')
      expect(slides[1].hasAttribute('aria-hidden')).toBe(false)
    })
  })

  describe('Fragments', () => {
    let deck
    let parent: HTMLElement

    beforeEach(() => {
      parent = render('* A\n* B\n\n---\n\n- C\n- D\n\n---\n\n* E\n* F')
      deck = bespoke()
    })

    it('adds inactive data-bespoke-marp-fragment attribute to fragmented list', () => {
      const q = '[data-marpit-fragment][data-bespoke-marp-fragment="inactive"]'
      expect(parent.querySelectorAll(q)).toHaveLength(4)
    })

    it('changes the first fragmented list item to active when calling next()', () => {
      deck.next()

      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(1)
      expect(
        parent.querySelectorAll('[data-bespoke-marp-fragment="inactive"]')
      ).toHaveLength(3)
      expect(
        parent.querySelectorAll('[data-bespoke-marp-fragment="active"]')
      ).toHaveLength(1)
    })

    it('adds data-bespoke-marp-current-fragment data attribute to current active item', () => {
      const firstItem = parent.querySelector<HTMLElement>(
        '[data-bespoke-marp-fragment]'
      )

      deck.next()
      expect(firstItem?.dataset.bespokeMarpFragment).toBe('active')
      expect(firstItem?.dataset.bespokeMarpCurrentFragment).not.toBeUndefined()

      deck.prev()
      expect(firstItem?.dataset.bespokeMarpFragment).toBe('inactive')
      expect(firstItem?.dataset.bespokeMarpCurrentFragment).toBeUndefined()
    })

    it('activates all fragments in slide when navigating by prev()', () => {
      deck.slide(1)
      deck.prev()

      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(2)
      expect(
        deck.slides[0].querySelectorAll('[data-bespoke-marp-fragment="active"]')
      ).toHaveLength(2)
    })

    it('deactivates all fragments in slide when navigating by next()', () => {
      deck.slide(1)
      deck.next()

      expect(deck.slide()).toBe(2)
      expect(deck.fragmentIndex).toBe(0)
      expect(
        deck.slides[2].querySelectorAll(
          '[data-bespoke-marp-fragment="inactive"]'
        )
      ).toHaveLength(2)
    })

    it('deactivates all fragments in slide when slide()', () => {
      deck.slide(2)

      expect(deck.fragmentIndex).toBe(0)
      expect(
        deck.slides[2].querySelectorAll(
          '[data-bespoke-marp-fragment="inactive"]'
        )
      ).toHaveLength(2)
    })

    it('allows to specify active fragment index when fragment option of slide()', () => {
      deck.slide(2, { fragment: 1 })

      const fragments = [
        ...deck.slides[2].querySelectorAll('[data-bespoke-marp-fragment]'),
      ]

      expect(deck.fragmentIndex).toBe(1)
      expect(
        fragments.map((f) => f.dataset.bespokeMarpFragment)
      ).toStrictEqual(['active', 'inactive'])
    })

    it('activates all fragments in slide when navigating by slide() with fragment option as -1', () => {
      deck.slide(2, { fragment: -1 })

      expect(deck.fragmentIndex).toBe(2)
      expect(
        deck.slides[2].querySelectorAll('[data-bespoke-marp-fragment="active"]')
      ).toHaveLength(2)
    })

    it('emits fragment event when changed fragment index', () => {
      const onFragment = jest.fn()
      deck.on('fragment', onFragment)

      deck.next()
      expect(onFragment).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          fragmentIndex: 1,
        })
      )

      onFragment.mockClear()
      deck.prev()
      expect(onFragment).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          fragmentIndex: 0,
        })
      )

      onFragment.mockClear()
      deck.slide(2, { fragment: -1 })
      expect(onFragment).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 2,
          fragmentIndex: 2,
        })
      )
    })
  })

  describe('Fullscreen', () => {
    let deck

    beforeEach(() => {
      render()
      deck = bespoke()
    })

    it('injects deck.fullscreen() to toggle fullscreen', async () => {
      await deck.fullscreen()
      expect((screenfull as Screenfull).toggle).toHaveBeenCalled()
    })

    it('toggles fullscreen by hitting f key', () => {
      keydown({ which: Key.F })
      expect((screenfull as Screenfull).toggle).toHaveBeenCalled()
    })

    it('toggles fullscreen by hitting F11 key', () => {
      keydown({ which: Key.F11 })
      expect((screenfull as Screenfull).toggle).toHaveBeenCalled()
    })
  })

  describe('Inactive', () => {
    it('adds bespoke-marp-inactive class after 2000ms', () => {
      const parent = render()
      bespoke()

      // Add inactive class after 2000 ms
      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-inactive')
    })

    it('fires marp-inactive event when the slide got inactive', () => {
      render()
      const deck = bespoke()
      const marpInactive = jest.fn()
      deck.on('marp-inactive', marpInactive)

      expect(marpInactive).not.toHaveBeenCalled()
      jest.advanceTimersByTime(2000)
      expect(marpInactive).toHaveBeenCalled()
    })

    it('resets timer when mouse is activated', () => {
      const parent = render()
      bespoke()

      jest.advanceTimersByTime(1000)

      // Trigger mousedown
      document.dispatchEvent(new MouseEvent('mousedown'))

      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-inactive')

      // Trigger mousemove
      document.dispatchEvent(new MouseEvent('mousemove'))
      expect(parent.className).not.toContain('bespoke-marp-inactive')

      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-inactive')
    })

    it('fires marp-active event when the slide got active', () => {
      render()
      const deck = bespoke()
      const marpActive = jest.fn()
      deck.on('marp-active', marpActive)

      jest.runAllTimers()
      expect(marpActive).not.toHaveBeenCalled()

      // Trigger mousemove
      document.dispatchEvent(new MouseEvent('mousemove'))
      expect(marpActive).toHaveBeenCalled()

      // It won't fire too even if mouse is activated while the state of slide is active
      marpActive.mockClear()
      document.dispatchEvent(new MouseEvent('mousemove'))
      expect(marpActive).not.toHaveBeenCalled()

      jest.advanceTimersByTime(2000)
      document.dispatchEvent(new MouseEvent('mousemove'))
      expect(marpActive).toHaveBeenCalled()
    })
  })

  describe('Interactive', () => {
    const elements = {
      input: '<input type="text" id="element" />',
      textarea: '<textarea id="element"></textarea>',
      select: '<select id="element"><option value="a">a</option></select>',
      button: '<button type="button" id="element">button</button>',
      audio:
        '<audio controls src="https://example.com/audio.mp3" id="element"></audio>',
      video:
        '<video controls src="https://example.com/video.mp3" id="element"></video>',
    }

    for (const kind of Object.keys(elements)) {
      const element = elements[kind]

      it(`prevents navigation on ${kind} element`, () => {
        render(`${element}\n\n---\n\n2`)
        const deck = bespoke()

        keydown(
          { bubbles: true, which: Key.RightArrow },
          document.getElementById('element')! // eslint-disable-line @typescript-eslint/no-non-null-assertion
        )
        expect(deck.slide()).toBe(0)

        keydown({ bubbles: true, which: Key.RightArrow }, deck.slides[0])
        expect(deck.slide()).toBe(1)
      })
    }
  })

  describe('Load', () => {
    it('adds data attribute to each slides after loaded', () => {
      render('# Regular\n\n---\n\n```\nnot-hideable\n```')
      const deck = bespoke()

      window.dispatchEvent(new Event('load'))

      const [first, second] = deck.slides
      expect(first.getAttribute('data-bespoke-marp-load')).toBe('hideable')
      expect(second.getAttribute('data-bespoke-marp-load')).toBe('')
    })
  })

  describe('Navigation', () => {
    it('navigates page by keyboard', () => {
      render()
      const deck = bespoke()

      keydown({ which: Key.RightArrow })
      expect(deck.slide()).toBe(1)

      keydown({ which: Key.LeftArrow })
      expect(deck.slide()).toBe(0)

      keydown({ which: Key.Space })
      expect(deck.slide()).toBe(1)

      keydown({ which: Key.Space, shiftKey: true })
      expect(deck.slide()).toBe(0)

      keydown({ which: Key.PageDown })
      expect(deck.slide()).toBe(1)

      keydown({ which: Key.PageUp })
      expect(deck.slide()).toBe(0)

      keydown({ which: Key.DownArrow })
      expect(deck.slide()).toBe(1)

      keydown({ which: Key.UpArrow })
      expect(deck.slide()).toBe(0)

      keydown({ which: Key.End })
      expect(deck.slide()).toBe(2)

      keydown({ which: Key.Home })
      expect(deck.slide()).toBe(0)
    })

    it('skips fragments when holding Shift key', () => {
      render('* A\n* B\n* C\n\n---\n\n* D\n* E')
      const deck = bespoke()

      keydown({ which: Key.RightArrow, shiftKey: true })
      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(3)

      keydown({ which: Key.DownArrow, shiftKey: true })
      expect(deck.slide()).toBe(1)
      expect(deck.fragmentIndex).toBe(2)

      keydown({ which: Key.LeftArrow, shiftKey: true })
      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(3)

      keydown({ which: Key.RightArrow })
      expect(deck.slide()).toBe(1)
      expect(deck.fragmentIndex).toBe(0)

      keydown({ which: Key.PageDown, shiftKey: true })
      expect(deck.fragmentIndex).toBe(2)

      keydown({ which: Key.UpArrow, shiftKey: true })
      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(3)

      keydown({ which: Key.RightArrow })
      expect(deck.slide()).toBe(1)
      expect(deck.fragmentIndex).toBe(0)

      keydown({ which: Key.PageUp, shiftKey: true })
      expect(deck.slide()).toBe(0)
      expect(deck.fragmentIndex).toBe(3)
    })

    describe('with wheel', () => {
      let parent: HTMLElement
      let deck

      beforeEach(() => {
        parent = render()
        deck = bespoke()

        jest.clearAllTimers()
      })

      const dispatch = (opts: WheelEventInit = {}, elm: Element = parent) =>
        elm.dispatchEvent(new WheelEvent('wheel', { ...opts, bubbles: true }))

      it('navigates page by vertical wheel with interval', () => {
        const now = jest.spyOn(Date, 'now')
        now.mockImplementation(() => 1000)

        dispatch({ deltaY: 1 })
        expect(deck.slide()).toBe(1)

        // Suppress navigation by continuous scrolling
        dispatch({ deltaY: 3 })
        expect(deck.slide()).toBe(1)

        // +300ms
        now.mockImplementation(() => 1300)
        jest.advanceTimersByTime(300)

        dispatch({ deltaY: 1 })
        expect(deck.slide()).toBe(2)

        // Backward
        now.mockImplementation(() => 1600)
        jest.advanceTimersByTime(600)

        dispatch({ deltaY: -1 })
        expect(deck.slide()).toBe(1)
      })

      it('navigates page by horizontal wheel with momentum scroll', () => {
        const now = jest.spyOn(Date, 'now')
        now.mockImplementation(() => 1000)

        dispatch({ deltaX: 100 })
        expect(deck.slide()).toBe(1)

        // Suppress navigation by momentum scroll
        for (let i = 0; i < 50; i += 1) {
          jest.advanceTimersByTime(20)
          now.mockImplementation(() => 1000 + i * 20)

          dispatch({ deltaX: Math.round(Math.E ** (i / -12.5) * 100) })
          expect(deck.slide()).toBe(1)
        }

        jest.advanceTimersByTime(20)
        now.mockImplementation(() => 2000)

        // Navigate if detected a not attenuated delta
        dispatch({ deltaX: 10 })
        expect(deck.slide()).toBe(2)
      })

      describe('when the target element is scrollable', () => {
        const overflowAuto = (decl = 'overflow') => {
          const elm = document.createElement('div')
          elm.style[decl] = 'auto'

          Object.defineProperties(elm, {
            clientHeight: { configurable: true, get: () => 300 },
            scrollHeight: { configurable: true, get: () => 400 },
          })

          return elm
        }

        const notScrollableElement = document.createElement('div')
        const overflowAutoElement = overflowAuto()
        const overflowYAutoElement = overflowAuto('overflowY')

        beforeEach(() => {
          const section = (idx) => deck.slides[idx].querySelector('section')

          section(0).appendChild(notScrollableElement)
          section(0).appendChild(overflowAutoElement)
          section(1).appendChild(overflowYAutoElement)
        })

        it('does not navigate page', () => {
          const now = jest.spyOn(Date, 'now')
          now.mockImplementation(() => 1000)

          dispatch({ deltaY: 1 }, overflowAutoElement)
          expect(deck.slide()).toBe(0)

          dispatch({ deltaY: 1 }, notScrollableElement)
          expect(deck.slide()).toBe(1)

          now.mockImplementation(() => 2000)
          jest.runAllTimers()

          dispatch({ deltaY: 1 }, overflowYAutoElement)
          expect(deck.slide()).toBe(1)

          dispatch({ deltaX: 1 }, overflowYAutoElement)
          expect(deck.slide()).toBe(2)
        })
      })
    })
  })

  describe('On-screen control', () => {
    let osc: HTMLDivElement

    beforeEach(() => render())

    describe('when document has an element that has bespoke-marp-osc class', () => {
      beforeEach(() => {
        osc = document.createElement('div')
        osc.className = 'bespoke-marp-osc'
        osc.innerHTML = `
            <span data-bespoke-marp-osc="page"></span>
            <button data-bespoke-marp-osc="prev">Prev</button>
            <button data-bespoke-marp-osc="next">Next</button>
            <button data-bespoke-marp-osc="fullscreen">Toggle fullscreen</button>
            <button data-bespoke-marp-osc="presenter">Open presenter view</button>
          `

        document.body.appendChild(osc)
      })

      it('moves OSC container in parent element of bespoke', () => {
        const deck = bespoke()
        expect(osc.parentElement).toBe(deck.parent)
      })

      it('toggles aria-hidden attribute by events emitted by "inactive" plugin', () => {
        const deck = bespoke()

        deck.fire('marp-inactive')
        expect(osc.getAttribute('aria-hidden')).toBe('true')

        deck.fire('marp-active')
        expect(osc.hasAttribute('aria-hidden')).toBe(false)
      })

      it('updates page number by navigation', () => {
        const deck = bespoke()
        const page = osc.querySelector('[data-bespoke-marp-osc="page"]')
        expect(page?.textContent).toBe('Page 1 of 3')

        deck.next()
        expect(page?.textContent).toBe('Page 2 of 3')
      })

      it('navigates slide deck when clicked next and prev button', () => {
        const deck = bespoke()
        const prev = osc.querySelector<HTMLButtonElement>(
          'button[data-bespoke-marp-osc="prev"]'
        )
        const next = osc.querySelector<HTMLButtonElement>(
          'button[data-bespoke-marp-osc="next"]'
        )

        expect(deck.slide()).toBe(0)
        expect(prev?.disabled).toBe(true)

        next?.click()
        expect(deck.slide()).toBe(1)
        expect(prev?.disabled).toBe(false)

        next?.click()
        expect(deck.slide()).toBe(2)
        expect(next?.disabled).toBe(true)

        prev?.click()
        expect(deck.slide()).toBe(1)
        expect(next?.disabled).toBe(false)
      })

      it('calls deck.fullscreen() when clicked fullscreen button', () => {
        const deck = bespoke()
        const fullscreen = jest.spyOn(deck as any, 'fullscreen')
        const button = osc.querySelector<HTMLButtonElement>(
          'button[data-bespoke-marp-osc="fullscreen"]'
        )

        button?.click()
        expect(fullscreen).toHaveBeenCalled()
      })

      it('calls deck.openPresenterView() when clicked presenter view button', () => {
        bespoke()
        const windowOpen = jest.spyOn(window, 'open').mockImplementation()
        const button = osc.querySelector<HTMLButtonElement>(
          'button[data-bespoke-marp-osc="presenter"]'
        )

        button?.click()
        expect(windowOpen).toHaveBeenCalled()
      })

      describe('when browser does not support fullscreen', () => {
        it('hides fullscreen button', () => {
          jest
            .spyOn(screenfull as any, 'isEnabled', 'get')
            .mockImplementation(() => false)

          bespoke()

          const button = osc.querySelector<HTMLButtonElement>(
            'button[data-bespoke-marp-osc="fullscreen"]'
          )

          expect(button?.style.display).toBe('none')
        })
      })

      describe('when localStorage throws error just by getting property', () => {
        beforeEach(() => {
          jest.resetModules()
          jest.spyOn(console, 'warn').mockImplementation()
          jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
            throw new Error()
          })
        })

        it('disables OSC button for opening presenter view', async () => {
          // Whether storage is available will determine while initializing
          // module, so we have to use isolated bespoke instance.
          ;(await import('../../src/templates/bespoke/bespoke')).default()

          const button = osc.querySelector<HTMLButtonElement>(
            'button[data-bespoke-marp-osc="presenter"]'
          )

          expect(button?.disabled).toBe(true)
        })
      })
    })
  })

  describe('Presenter view', () => {
    describe('In normal view mode', () => {
      beforeEach(() => {
        jest.spyOn(window, 'open').mockImplementation()
        render()
      })

      it('injects deck.presenterUrl property to get URL of presenter view', () => {
        replaceLocation('/?sync=xxx', () => {
          const deck = bespoke()

          expect(typeof deck.presenterUrl).toBe('string')
          expect(deck.presenterUrl).toContain('view=presenter')
          expect(deck.presenterUrl).toContain('sync=xxx')
        })
      })

      it('injects deck.openPresenterView() to open presenter view', () => {
        replaceLocation('/?sync=synckey', () => {
          const deck = bespoke()
          expect(deck.openPresenterView).toBeInstanceOf(Function)

          deck.openPresenterView()
          expect(window.open).toHaveBeenCalledWith(
            deck.presenterUrl,
            'bespoke-marp-presenter-synckey',
            expect.stringContaining('menubar=no,toolbar=no')
          )
        })
      })

      it('opens presenter view by hitting p key', () => {
        bespoke()
        keydown({ which: Key.P })
        expect(window.open).toHaveBeenCalled()

        // Ignore hitting p key with modifier
        ;(window.open as jest.Mock).mockClear()

        keydown({ which: Key.P, ctrlKey: true })
        expect(window.open).not.toHaveBeenCalled()
      })
    })

    describe('In presenter view mode', () => {
      const $p = (klass: string) =>
        document.querySelector(`.${klass}`) as HTMLElement

      const testPresenterView = (
        func: (obj: { deck: any; parent: HTMLElement }) => void,
        md?: string
      ) =>
        replaceLocation('/?view=presenter', () => {
          const parent = render(md)
          const deck = bespoke()

          func({ deck, parent })
        })

      it('adds container for presenter', () => {
        document.title = 'TITLE'

        testPresenterView(() => {
          expect(document.title).toBe('[Presenter view] - TITLE')
          expect($p(classes.container)).toBeTruthy()
        })
      })

      it('navigates slide when clicked navigation button', () =>
        testPresenterView(({ deck }) => {
          const text = $p(classes.infoPageText)

          expect(deck.slide()).toBe(0)
          expect(text.textContent).toBe('1 / 2')

          $p(classes.infoPageNext).click()
          expect(deck.slide()).toBe(1)
          expect(deck.fragmentIndex).toBe(0)
          expect(text.textContent).toBe('2 / 2')

          $p(classes.infoPageNext).click()
          expect(deck.slide()).toBe(1)
          expect(deck.fragmentIndex).toBe(1)

          $p(classes.infoPagePrev).click()
          expect(deck.slide()).toBe(1)
          expect(deck.fragmentIndex).toBe(0)
        }, '\n\n---\n\n* a\n* b'))

      describe('Next slide view', () => {
        describe('when next slide frame is loaded', () => {
          const setupNext = () => {
            const postMessageSpy = jest.spyOn(
              ($p(classes.next) as any).contentWindow,
              'postMessage'
            )

            $p(classes.next).dispatchEvent(new Event('load'))
            return { postMessageSpy }
          }

          it('marks next slide container as active', () =>
            testPresenterView(({ deck }) => {
              expect($p(classes.nextContainer).className).not.toContain(
                'active'
              )
              deck.slide(2)

              const { postMessageSpy } = setupNext()
              expect($p(classes.nextContainer).className).toContain('active')

              // Send navigate command with current page
              expect(postMessageSpy).toHaveBeenCalledWith('navigate:2,0', '*')
            }))

          it('sends navigate command to next slide view when navigated slide', () =>
            testPresenterView(({ deck }) => {
              const { postMessageSpy } = setupNext()

              postMessageSpy.mockClear()
              expect(postMessageSpy).not.toHaveBeenCalled()

              deck.next()
              expect(postMessageSpy).toHaveBeenCalledWith('navigate:1,0', '*')
            }))
        })

        it('navigates to next slide when clicked next slide container', () => {
          testPresenterView(({ deck }) => {
            expect($p(classes.nextContainer)).toBeTruthy()
            expect(deck.slide()).toBe(0)

            $p(classes.nextContainer).click()
            expect(deck.slide()).toBe(1)
          })
        })
      })

      describe('Presenter note', () => {
        it('marks element with bespoke-marp-note class and current slide index as active', () =>
          testPresenterView(({ deck }) => {
            const noteA = document.querySelector(
              '.bespoke-marp-note[data-index="0"]'
            )
            const noteB = document.querySelector(
              '.bespoke-marp-note[data-index="1"]'
            )

            expect(noteA).toBeTruthy()
            expect(noteB).toBeTruthy()

            expect(noteA?.className).toContain('active')
            expect(noteB?.className).not.toContain('active')

            deck.next()
            expect(noteA?.className).not.toContain('active')
            expect(noteB?.className).toContain('active')
          }, '<!-- A -->\n\n---\n\n<!-- B -->'))
      })
    })

    describe('In next view mode', () => {
      const testNextView = (
        func: (obj: { deck: any; parent: HTMLElement }) => void,
        md?: string
      ) =>
        replaceLocation('/?view=next', () => {
          const parent = render(md)
          const deck = bespoke()

          func({ deck, parent })
        })

      it('subscribes navigation in the parent presenter view and navigate to its next page', () =>
        new Promise((done) =>
          testNextView(({ deck }) => {
            // https://github.com/jsdom/jsdom/issues/2745
            jest
              .spyOn(MessageEvent.prototype, 'origin', 'get')
              .mockImplementation(() => 'null')

            window.addEventListener('message', () => {
              expect(deck.slide()).toBe(2)
              done()
            })
            window.postMessage('navigate:1,0', '*')
          })
        ))
    })
  })

  describe('Progress', () => {
    let progressParent: HTMLElement
    let progressBar: HTMLElement

    beforeEach(() => {
      render()

      progressBar = document.createElement('div')
      progressBar.classList.add('bespoke-progress-bar')

      progressParent = document.createElement('div')
      progressParent.classList.add('bespoke-progress-parent')
      progressParent.appendChild(progressBar)

      document.body.appendChild(progressParent)
    })

    it('changes flexBasis style by navigate', () => {
      const deck = bespoke()
      expect(progressBar.style.flexBasis).toBe('0%')

      deck.slide(1)
      expect(progressBar.style.flexBasis).toBe('50%')

      deck.slide(2)
      expect(progressBar.style.flexBasis).toBe('100%')
    })
  })

  describe('State', () => {
    it('activates specified page by hash index', () => {
      history.replaceState(null, document.title, '#2')

      render()
      const deck = bespoke()
      jest.runAllTimers()

      expect(deck.slide()).toBe(1)

      // Navigate by anchor
      history.replaceState(null, document.title, '#3')
      window.dispatchEvent(new HashChangeEvent('hashchange'))

      expect(deck.slide()).toBe(2)
    })

    it('activates specified fragment state by "f" query param', () => {
      history.replaceState(null, document.title, '?f=1')

      render('* a\n* b\n\n---\n\n* a\n* b\n* c')
      const deck = bespoke()
      jest.runAllTimers()

      expect(deck.fragmentIndex).toBe(1)
      expect(
        deck.slides[0].querySelectorAll('[data-bespoke-marp-fragment="active"]')
      ).toHaveLength(1)
      expect(
        deck.slides[0].querySelectorAll(
          '[data-bespoke-marp-fragment="inactive"]'
        )
      ).toHaveLength(1)

      // In the initial state of fragments, remove query param
      deck.prev()
      expect(deck.fragmentIndex).toBe(0)
      expect(location.search).toBe('')

      deck.next()
      expect(deck.fragmentIndex).toBe(1)
      expect(location.search).toBe('?f=1')

      // With hash for page number
      history.replaceState(null, document.title, '?f=2#2')
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(deck.slide()).toBe(1)
      expect(deck.fragmentIndex).toBe(2)
      expect(
        deck.slides[1].querySelectorAll('[data-bespoke-marp-fragment="active"]')
      ).toHaveLength(2)
      expect(
        deck.slides[1].querySelectorAll(
          '[data-bespoke-marp-fragment="inactive"]'
        )
      ).toHaveLength(1)
    })
  })

  describe('Sync', () => {
    const markdown = '# 1\n\n---\n\n# 2\n\n* A\n* B\n* C\n\n---\n\n# 3'

    const storeKey = (key: string) => `bespoke-marp-sync-${key}`
    const getStore = (key: string) => {
      const item = localStorage.getItem(storeKey(key))
      return item ? JSON.parse(item) : null
    }

    beforeEach(() => render(markdown))

    it('defines auto-generated deck.syncKey', () => {
      const deck = bespoke()
      expect(typeof deck.syncKey).toBe('string')
    })

    it('uses sync query param if defined', () => {
      replaceLocation('/?sync=test', () => {
        const deck = bespoke()
        expect(deck.syncKey).toBe('test')
      })
    })

    it('updates reference count stored in localStorage', () => {
      let deck
      let anotherDeck

      replaceLocation('/?sync=test', () => {
        deck = bespoke()
        expect(getStore('test').reference).toBe(1)
      })

      replaceLocation('/?sync=test', () => {
        anotherDeck = bespoke(document.createElement('div'))
        expect(getStore('test').reference).toBe(2)
      })

      anotherDeck.destroy()
      expect(getStore('test').reference).toBe(1)

      deck.destroy()
      expect(getStore('test')).toBeNull()
    })

    it('stores the state of slide progress by navigation', () => {
      replaceLocation('/?sync=test', () => {
        const deck = bespoke()
        jest.runAllTimers()

        deck.next()
        expect(getStore('test')).toMatchObject({ index: 1, fragmentIndex: 0 })

        deck.next()
        expect(getStore('test')).toMatchObject({ index: 1, fragmentIndex: 1 })

        deck.next()
        expect(getStore('test')).toMatchObject({ index: 1, fragmentIndex: 2 })

        deck.next()
        expect(getStore('test')).toMatchObject({ index: 1, fragmentIndex: 3 })

        deck.next()
        expect(getStore('test')).toMatchObject({ index: 2, fragmentIndex: 0 })

        deck.slide(0)
        expect(getStore('test')).toMatchObject({ index: 0, fragmentIndex: 0 })

        deck.slide(1, { fragment: 2 })
        expect(getStore('test')).toMatchObject({ index: 1, fragmentIndex: 2 })
      })
    })

    it('syncs state by storage event', async () => {
      const foreignFrame = document.createElement('iframe')
      document.body.appendChild(foreignFrame)

      const updateStore = (key: string, data: Record<string, any>) =>
        new Promise((resolve, reject) => {
          try {
            window.addEventListener('storage', resolve, { once: true })

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            foreignFrame.contentWindow!.localStorage.setItem(
              storeKey(key),
              JSON.stringify({ ...getStore(key), ...data })
            )
          } catch (e) {
            reject(e)
          }
        })

      await replaceLocation('/?sync=test', async () => {
        const deck = bespoke()
        expect(deck.slide()).toBe(0)
        expect(deck.fragmentIndex).toBe(0)

        await updateStore('test', { index: 1, fragmentIndex: 0 })
        expect(deck.slide()).toBe(1)
        expect(deck.fragmentIndex).toBe(0)

        await updateStore('test', { index: 1, fragmentIndex: 3 })
        expect(deck.slide()).toBe(1)
        expect(deck.fragmentIndex).toBe(3)

        // Not sync with storage if indexes have not changed
        deck.next()
        await updateStore('test', { reference: 2 })
        expect(deck.slide()).toBe(2)
      })
    })

    describe('when the quota of storage has limited', () => {
      beforeEach(() => {
        // Eat up to the default quota
        localStorage.clear()
        localStorage.setItem('eater', 'x'.repeat(4999995))
      })

      afterEach(() => localStorage.clear())

      it('does not throw any errors while initialize plugin', () =>
        expect(() =>
          replaceLocation('/?sync=test', () => {
            bespoke()
          })
        ).not.toThrow())
    })

    describe('when localStorage throws error just by getting property', () => {
      beforeEach(() =>
        jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
          throw new Error()
        })
      )

      it('does not throw any errors while initialize plugin', () =>
        expect(() =>
          replaceLocation('/?sync=test', () => {
            bespoke()
          })
        ).not.toThrow())
    })
  })

  describe('Touch', () => {
    let parent
    let deck

    beforeEach(() => {
      parent = render()

      // jsdom is not supported touch events currently.
      const original = parent.addEventListener

      parent.addEventListener = (type: string, listener, useCapture?) => {
        if (!type.startsWith('touch'))
          return original.call(parent, type, listener, useCapture)

        parent[type] = listener
      }

      parent.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 200,
        width: 200,
        height: 200,
      })

      deck = bespoke()
    })

    const touch = (event: string, ...touches: [number, number][]) => {
      const type = `touch${event}`

      return parent[type]({
        touches: touches.map((t) => ({ pageX: t[0], pageY: t[1] })),
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      })
    }

    it('supports swipe navigation', () => {
      // Swipe to left
      touch('start', [150, 150])
      touch('move', [120, 150])
      touch('end')

      expect(deck.slide()).toBe(1)

      // Swipe to up (Recognize direction until 35deg)
      touch('start', [0, 0])
      touch('move', [42, -50])
      touch('end')

      expect(deck.slide()).toBe(2)

      // Swipe to right
      touch('start', [0, 0])
      touch('move', [43, -50])
      touch('end')

      expect(deck.slide()).toBe(1)

      // Swipe to down
      touch('start', [42, 30])
      touch('move', [0, 80])
      touch('end')

      expect(deck.slide()).toBe(0)
    })

    it('does not recognize short swipe', () => {
      deck.slide(1)

      touch('start', [0, 0])
      touch('move', [-29, 0])
      touch('end')

      expect(deck.slide()).toBe(1)

      touch('start', [0, 0])
      touch('move', [21, 21])
      touch('end')

      expect(deck.slide()).toBe(1)

      // Recognize swipe if distance is longer than 30
      touch('start', [0, 0])
      touch('move', [22, 22])
      touch('end')

      expect(deck.slide()).toBe(0)
    })

    it('does not navigate when touched with multi fingers', () => {
      deck.slide(1)

      // Pinch
      touch('start', [20, 20], [40, 20])
      touch('move', [0, 20], [80, 20])
      touch('end')

      expect(deck.slide()).toBe(1)

      // Add finger while moving
      touch('start', [50, 50])
      touch('move', [0, 50])
      touch('move', [0, 50], [20, 40])
      touch('end')

      expect(deck.slide()).toBe(1)
    })
  })

  describe('Wake lock', () => {
    const wakeLockObj = { addEventListener: jest.fn() }
    const request: jest.Mock = jest.fn()

    beforeEach(() => {
      jest.spyOn(console, 'debug').mockImplementation()

      request.mockReset().mockResolvedValue(wakeLockObj)
      wakeLockObj.addEventListener.mockReset()
      navigator['wakeLock'] = { request }

      _clearCachedWakeLockApi()
      render()
    })

    afterEach(() => delete navigator['wakeLock'])

    it('calls requestWakeLock() in wake-lock plugin if Screen Wake Lock API is available', () => {
      expect(request).not.toHaveBeenCalled()
      bespoke()
      expect(request).toHaveBeenCalledWith('screen')
    })

    it('prevents to throw error while requesting wake-lock', () =>
      new Promise((done) => {
        const err = new Error('test')
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

        warnSpy.mockImplementation((e) => {
          expect(e).toStrictEqual(err)
          done()
        })

        request.mockRejectedValue(err)
        bespoke()
      }))

    it('requests to enable wake-lock again when changed the state of visibility', () => {
      bespoke()

      request.mockClear()
      expect(request).not.toHaveBeenCalled()

      document.dispatchEvent(new Event('visibilitychange'))
      expect(request).toHaveBeenCalled()
    })
  })
})
