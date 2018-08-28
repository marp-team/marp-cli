/** @jest-environment jsdom */
import Marp from '@marp-team/marp-core'
import { Element as MarpitElement } from '@marp-team/marpit'
import { Key } from 'ts-keycode-enum'
import bespoke from '../../src/templates/bespoke/bespoke'
import context from '../_helpers/context'
import { useSpy } from '../_helpers/spy'

jest.useFakeTimers()

describe("Bespoke template's browser context", () => {
  const marp = new Marp({
    container: new MarpitElement('div', { id: 'presentation' }),
  })

  const defaultMarkdown = '# 1\n\n---\n\n## 2\n\n---\n\n### 3'

  const render = (md = defaultMarkdown): HTMLElement => {
    document.body.innerHTML = marp.render(md).html
    return document.getElementById('presentation')
  }

  describe('Classes', () => {
    it('adds bespoke classes to #presentation', () => {
      const parent = render()
      const deck = bespoke()
      expect(parent.classList.contains('bespoke-marp-parent')).toBe(true)

      const slides = parent.querySelectorAll('.bespoke-marp-slide')
      expect(slides).toHaveLength(3)
      expect(slides[0].classList.contains('bespoke-marp-active')).toBe(true)

      // Navigate slide
      deck.next()
      expect(slides[0].classList.contains('bespoke-marp-active')).toBe(false)
      expect(slides[1].classList.contains('bespoke-marp-active')).toBe(true)
    })
  })

  describe('Cursor', () => {
    it('adds bespoke-marp-cursor-inactive class after 2000ms', () => {
      const parent = render()
      bespoke()

      // Add inactive class after 2000 ms
      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-cursor-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-cursor-inactive')
    })

    it('resets timer when mouse is activated', () => {
      const parent = render()
      bespoke()

      jest.advanceTimersByTime(1000)

      // Trigger mousedown
      const mousedown = document.createEvent('MouseEvents')
      mousedown.initEvent('mousedown', true, true)
      document.dispatchEvent(mousedown)

      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-cursor-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-cursor-inactive')

      // Trigger mousemove
      const mousemove = document.createEvent('MouseEvents')
      mousemove.initEvent('mousemove', true, true)
      document.dispatchEvent(mousemove)

      expect(parent.className).not.toContain('bespoke-marp-cursor-inactive')

      jest.advanceTimersByTime(1999)
      expect(parent.className).not.toContain('bespoke-marp-cursor-inactive')

      jest.advanceTimersByTime(1)
      expect(parent.className).toContain('bespoke-marp-cursor-inactive')
    })
  })

  describe('Hash', () => {
    it('activates initial page by hash index', () => {
      location.href = 'http://localhost/#2'

      render()
      const deck = bespoke()

      jest.runAllTimers()
      expect(deck.slide()).toBe(1)

      // Navigate by anchor
      location.hash = '#3'
      window.dispatchEvent(new HashChangeEvent('hashchange'))

      expect(deck.slide()).toBe(2)
    })
  })

  describe('Navigation', () => {
    let parent: HTMLElement
    let deck

    beforeEach(() => {
      parent = render()
      deck = bespoke()

      jest.clearAllTimers()
    })

    it('navigates page by keyboard', () => {
      const keydown = opts =>
        document.dispatchEvent(new KeyboardEvent('keydown', opts))

      // bespoke-keys
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

      // Additional keys by Marp
      keydown({ which: Key.DownArrow })
      expect(deck.slide()).toBe(1)

      keydown({ which: Key.UpArrow })
      expect(deck.slide()).toBe(0)

      keydown({ which: Key.End })
      expect(deck.slide()).toBe(2)

      keydown({ which: Key.Home })
      expect(deck.slide()).toBe(0)
    })

    context('with wheel', () => {
      const dispatch = (opts: WheelEventInit = {}, elm: Element = parent) =>
        elm.dispatchEvent(new WheelEvent('wheel', { ...opts, bubbles: true }))

      it('navigates page by vertical wheel with interval', () => {
        const now = jest.spyOn(Date, 'now')

        useSpy([now], () => {
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
      })

      it('navigates page by horizontal wheel with momentum scroll', () => {
        const now = jest.spyOn(Date, 'now')

        useSpy([now], () => {
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
      })

      context('when the target element is scrollable', () => {
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
          const section = idx => deck.slides[idx].querySelector('section')

          section(0).appendChild(notScrollableElement)
          section(0).appendChild(overflowAutoElement)
          section(1).appendChild(overflowYAutoElement)
        })

        it('does not navigate page', () => {
          const now = jest.spyOn(Date, 'now')

          useSpy([now], () => {
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
        touches: touches.map(t => ({ pageX: t[0], pageY: t[1] })),
        preventDefault: jest.fn(),
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
})
