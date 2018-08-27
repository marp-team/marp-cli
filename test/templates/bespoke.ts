/** @jest-environment jsdom */
import Marp from '@marp-team/marp-core'
import { Element } from '@marp-team/marpit'
import bespoke from '../../src/templates/bespoke/bespoke'
import context from '../_helpers/context'

jest.useFakeTimers()

describe("Bespoke template's browser context", () => {
  const marp = new Marp({
    container: new Element('div', { id: 'presentation' }),
  })

  const render = (md = '# 1\n\n---\n\n## 2\n\n---\n\n### 3') => {
    document.body.innerHTML = marp.render(md).html
    return document.getElementById('presentation')
  }

  context('Classes', () => {
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

  context('Cursor', () => {
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

  context('Hash', () => {
    it('activates initial page by hash index', () => {
      location.href = 'http://localhost/#2'

      const parent = render()
      const deck = bespoke()
      const slides = parent.querySelectorAll('.bespoke-marp-slide')

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
})
