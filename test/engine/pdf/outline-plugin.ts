/** @jest-environment jsdom */
import { Marp } from '@marp-team/marp-core'
import {
  pdfOutlinePlugin,
  pptrOutlinePositionResolver,
  pdfOutlineInfo,
  pdfOutlineAttr,
  OutlinePage,
} from '../../../src/engine/pdf/outline-plugin'

describe('Marp CLI outline plugin for Marpit', () => {
  const marp = new Marp({ html: true, script: false }).use(pdfOutlinePlugin)

  describe('#pptrOutlinePositionResolver', () => {
    it('collects the position and display text from the marked elements', () => {
      const { html } = marp.render(
        [
          '# Hello',
          '## <br /> world<span style="display:none">!</span>',
          '---',
          '### :smile:<p>smile</p>',
        ].join('\n\n')
      )

      const outlinePages: OutlinePage[] = marp[pdfOutlineInfo]
      expect(outlinePages).toMatchInlineSnapshot(`
        [
          {
            "headings": [
              {
                "key": "pdf-outline:0",
                "level": 1,
              },
              {
                "key": "pdf-outline:1",
                "level": 2,
              },
            ],
            "pageNumber": 1,
          },
          {
            "headings": [
              {
                "key": "pdf-outline:2",
                "level": 3,
              },
            ],
            "pageNumber": 2,
          },
        ]
      `)

      // Prepare DOM: JSDOM does not support layout calculation by
      // `getBoundingClientRect()` so we have to mock it manually for testing.
      document.body.innerHTML = html

      const genDOMRectMock = (
        x: number,
        y: number,
        width: number,
        height: number
      ): DOMRect => {
        const obj = {
          x,
          y,
          width,
          height,
          left: x,
          top: y,
          right: x + width,
          bottom: y + height,
        }
        return { ...obj, toJSON: () => obj }
      }

      document
        .querySelectorAll('h1, h2, h3, h4, h5, h6, img, p, span')
        .forEach((elm) => {
          elm.getBoundingClientRect = jest.fn(() =>
            genDOMRectMock(0, 0, 100, 20)
          )
        })

      document.querySelectorAll('br').forEach((elm) => {
        // <br> has no width
        elm.getBoundingClientRect = jest.fn(() => genDOMRectMock(0, 0, 0, 20))
      })

      // Page 1
      const page1 = pptrOutlinePositionResolver(
        outlinePages[0].headings,
        pdfOutlineAttr
      )
      expect(page1).toMatchInlineSnapshot(`
        {
          "pdf-outline:0": [
            0,
            0,
            "Hello",
          ],
          "pdf-outline:1": [
            0,
            0,
            "world!",
          ],
        }
      `)

      // Page 2
      const page2 = pptrOutlinePositionResolver(
        outlinePages[1].headings,
        pdfOutlineAttr
      )
      expect(page2).toMatchInlineSnapshot(`
        {
          "pdf-outline:2": [
            0,
            0,
            "😄 smile",
          ],
        }
      `)
    })
  })
})
