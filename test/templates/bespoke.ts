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

  const render = (md = '# 1\n\n---\n\n## 2\n\n---\n\n### 3') => {
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
      const { slides } = deck

      jest.runAllTimers()
      expect(slides[0].classList.contains('bespoke-marp-active')).toBe(false)
      expect(slides[1].classList.contains('bespoke-marp-active')).toBe(true)

      // Navigate by anchor
      location.hash = '#3'
      window.dispatchEvent(new HashChangeEvent('hashchange'))

      expect(slides[1].classList.contains('bespoke-marp-active')).toBe(false)
      expect(slides[2].classList.contains('bespoke-marp-active')).toBe(true)
    })
  })

  describe('Navigation', () => {
    const current = () => document.querySelector('.bespoke-marp-active')

    it('navigates page by keyboard', () => {
      render()
      const deck = bespoke()
      const { slides } = deck

      const keydown = opts => {
        document.dispatchEvent(new KeyboardEvent('keydown', opts))
      }

      // bespoke-keys
      keydown({ which: Key.RightArrow })
      expect(current()).toBe(slides[1])

      keydown({ which: Key.LeftArrow })
      expect(current()).toBe(slides[0])

      keydown({ which: Key.Space })
      expect(current()).toBe(slides[1])

      keydown({ which: Key.Space, shiftKey: true })
      expect(current()).toBe(slides[0])

      keydown({ which: Key.PageDown })
      expect(current()).toBe(slides[1])

      keydown({ which: Key.PageUp })
      expect(current()).toBe(slides[0])

      // Additional keys by Marp
      keydown({ which: Key.DownArrow })
      expect(current()).toBe(slides[1])

      keydown({ which: Key.UpArrow })
      expect(current()).toBe(slides[0])

      keydown({ which: Key.End })
      expect(current()).toBe(slides[2])

      keydown({ which: Key.Home })
      expect(current()).toBe(slides[0])
    })

    context('with wheel', () => {
      let parent
      let deck
      let slides

      beforeEach(() => {
        parent = render()
        deck = bespoke()
        slides = deck.slides

        jest.clearAllTimers()
      })

      const dispatch = (opts: WheelEventInit = {}, elm: Element = parent) =>
        elm.dispatchEvent(new WheelEvent('wheel', { ...opts, bubbles: true }))

      it('navigates page by vertical wheel with interval', () => {
        const now = jest.spyOn(Date, 'now')

        useSpy([now], () => {
          now.mockImplementation(() => 1000)

          dispatch({ deltaY: 1 })
          expect(current()).toBe(slides[1])

          // Suppress navigation by continuous scrolling
          dispatch({ deltaY: 3 })
          expect(current()).toBe(slides[1])

          // +300ms
          now.mockImplementation(() => 1300)
          jest.advanceTimersByTime(300)

          dispatch({ deltaY: 1 })
          expect(current()).toBe(slides[2])

          // Backward
          now.mockImplementation(() => 1600)
          jest.advanceTimersByTime(600)

          dispatch({ deltaY: -1 })
          expect(current()).toBe(slides[1])
        })
      })

      it('navigates page by horizontal wheel with momentum scroll', () => {
        const now = jest.spyOn(Date, 'now')

        useSpy([now], () => {
          now.mockImplementation(() => 1000)

          dispatch({ deltaX: 100 })
          expect(current()).toBe(slides[1])

          // Suppress navigation by momentum scroll
          for (let i = 0; i < 50; i += 1) {
            jest.advanceTimersByTime(20)
            now.mockImplementation(() => 1000 + i * 20)

            dispatch({ deltaX: Math.round(Math.E ** (i / -12.5) * 100) })
            expect(current()).toBe(slides[1])
          }

          jest.advanceTimersByTime(20)
          now.mockImplementation(() => 2000)

          // Navigate if detected a not attenuated delta
          dispatch({ deltaX: 10 })
          expect(current()).toBe(slides[2])
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
          const section = idx => slides[idx].querySelector('section')

          section(0).appendChild(notScrollableElement)
          section(0).appendChild(overflowAutoElement)
          section(1).appendChild(overflowYAutoElement)
        })

        it('does not navigate page', () => {
          const now = jest.spyOn(Date, 'now')

          useSpy([now], () => {
            now.mockImplementation(() => 1000)

            dispatch({ deltaY: 1 }, overflowAutoElement)
            expect(current()).toBe(slides[0])

            dispatch({ deltaY: 1 }, notScrollableElement)
            expect(current()).toBe(slides[1])

            now.mockImplementation(() => 2000)
            jest.runAllTimers()

            dispatch({ deltaY: 1 }, overflowYAutoElement)
            expect(current()).toBe(slides[1])

            dispatch({ deltaX: 1 }, overflowYAutoElement)
            expect(current()).toBe(slides[2])
          })
        })
      })
    })
  })
})
