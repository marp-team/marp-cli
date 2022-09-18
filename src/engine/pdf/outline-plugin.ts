import type { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import type { PDFOutline } from '../../utils/pdf'

export interface OutlinePage {
  pageNumber: number
  headings: OutlineHeading[]
}

export interface OutlineHeading {
  level: number
  key: string
}

export type OutlineData = Record<
  string,
  [x: number, y: number, text: string] | undefined
>

export const pdfOutlineAttr = 'data-marp-cli-pdf-outline' as const
export const pdfOutlineInfo = Symbol()

export function pdfOutlinePlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.core.ruler.push('marp_cli_pdf_outline', (state) => {
    if (state.inlineMode) return

    const pages: OutlinePage[] = []

    let currentPage = -1
    let headings: OutlineHeading[] = []
    let headingKey = 0

    for (const token of state.tokens) {
      if (
        token.type === 'marpit_slide_open' &&
        token.meta?.marpitSlide != null
      ) {
        // Page index and page number may be different when modified by plugins.
        currentPage = token.meta.marpitSlide
      }

      if (token.meta?.marpitSlideElement === 1) {
        headings = []
      } else if (token.meta?.marpitSlideElement === -1) {
        pages.push({
          pageNumber: currentPage + 1,
          headings: [...headings],
        })
      } else if (token.type === 'heading_open') {
        const key = `pdf-outline:${headingKey++}`

        token.attrSet(pdfOutlineAttr, key)
        headings.push({ key, level: token.markup.length })
      }
    }

    md.marpit[pdfOutlineInfo] = pages
  })
}

export const pptrOutlinePositionResolver = (
  headings: OutlineHeading[],
  attr: typeof pdfOutlineAttr
): OutlineData => {
  const getPosition = (el: Element): [x: number, y: number] | undefined => {
    if (el instanceof HTMLElement) {
      return [el.offsetLeft, el.offsetTop]
    } else if (el instanceof SVGGraphicsElement) {
      const bbox = el.getBBox()
      return [bbox.x, bbox.y]
    }
    return undefined
  }

  const positions: OutlineData = {}

  for (const heading of headings) {
    const elm = document.querySelector(`[${attr}="${heading.key}"]`)

    if (elm) {
      let position: [x: number, y: number] | undefined = undefined
      let current: Element | null = elm

      while (current && current.getAttribute('data-marpit-svg') == null) {
        const pos = getPosition(current)

        if (position) {
          if (pos) {
            position[0] += pos[0]
            position[1] += pos[1]
          }
        } else {
          position = pos
        }

        current = current.parentElement
      }

      positions[heading.key] = position
        ? [...position, elm.textContent ?? '']
        : undefined
    }
  }

  return positions
}

export const generatePDFOutlines = (
  pages: OutlinePage[],
  data: OutlineData,
  { width, height }: { width: number; height: number }
) => {
  const { length } = pages
  const outlines: PDFOutline[] = []

  for (let i = 0; i < length; i += 1) {
    const outlinePage = pages[i]

    if (outlinePage) {
      const pdfOutlinePage: PDFOutline = {
        title: `Page ${outlinePage.pageNumber}`,
        to: i,
        bold: true,
        children: [],
        open: true,
      }

      const targets: [children: PDFOutline[], level: number][] = [
        [pdfOutlinePage.children, Number.NEGATIVE_INFINITY],
      ]

      // Make outline tree from heading list
      for (const heading of outlinePage.headings) {
        const d = data?.[heading.key]
        const outline: PDFOutline = {
          title: d?.[2] ?? '',
          to: d ? [i, d[0] / width, 1 - d[1] / height] : i,
          open: true,
          children: [],
        }

        while (targets[0][1] >= heading.level) targets.shift()

        targets[0][0].push(outline)
        targets.unshift([outline.children, heading.level])
      }

      outlines.push(pdfOutlinePage)
    }
  }

  return outlines
}

export default pdfOutlinePlugin
