import type { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'
import type { PDFOutline, PDFOutlineItemWithChildren } from '../../utils/pdf'

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

  const getInnerText = (node: Node) => {
    let text = ''

    if (node.nodeType === Node.ELEMENT_NODE) {
      const elm = node as Element
      const rect = elm.getBoundingClientRect()
      const style = window.getComputedStyle(elm)
      const visible =
        (rect.width > 0 || rect.height > 0) && style.visibility === 'visible'

      if (visible) {
        // Alternative text
        if (
          elm.tagName === 'AREA' ||
          elm.tagName === 'IMG' ||
          (elm.tagName === 'INPUT' && elm.getAttribute('type') === 'image')
        ) {
          text += elm.getAttribute('alt') ?? ''
        }

        // Line breaks
        if (elm.tagName === 'BR') {
          text += '\n'
        } else {
          // Children
          elm.childNodes.forEach((cNode) => {
            text += getInnerText(cNode)
          })

          // Block elements
          if (elm.tagName === 'P') text += '\n'
          if (!style.display.startsWith('inline')) text += '\n'
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    }

    return text
  }

  /** @see https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#whitespace_helper_functions */
  const normalizeDOMText = (text: string) => {
    let normalized = text.replace(/[\t\n\r ]+/g, ' ')

    if (normalized.charAt(0) === ' ') normalized = normalized.slice(1)
    if (normalized.charAt(normalized.length - 1) === ' ')
      normalized = normalized.slice(0, -1)

    return normalized
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
        ? [...position, normalizeDOMText(getInnerText(elm))]
        : undefined
    }
  }

  return positions
}

type GeneratePDFOutlinesOptions = {
  pages: boolean
  data?: OutlineData
} & (
  | { headings: false }
  | { headings: true; size: { width: number; height: number } }
)

export const generatePDFOutlines = (
  pages: OutlinePage[],
  opts: GeneratePDFOutlinesOptions
) => {
  const { length } = pages
  const outlines: PDFOutline[] = []

  const targets: [children: PDFOutline[], level: number][] = [
    [outlines, Number.NEGATIVE_INFINITY],
  ]

  const push = (outline: PDFOutlineItemWithChildren, level: number) => {
    while (targets[0][1] >= level) targets.shift()

    targets[0][0].push(outline)
    targets.unshift([outline.children, level])
  }

  for (let i = 0; i < length; i += 1) {
    const outlinePage = pages[i]

    if (outlinePage) {
      let pdfOutlinePage: PDFOutlineItemWithChildren | undefined

      if (opts.pages) {
        pdfOutlinePage = {
          title: `Page ${outlinePage.pageNumber}`,
          to: i,
          bold: true,
          children: [],
          open: true,
        }
        push(pdfOutlinePage, -1)
      }

      if (opts.headings && opts.data) {
        for (const heading of outlinePage.headings) {
          const d = opts.data[heading.key]

          push(
            {
              title: d?.[2] ?? '',
              to: d
                ? [i, d[0] / opts.size.width, 1 - d[1] / opts.size.height]
                : i,
              open: true,
              children: [],
            },
            heading.level
          )
        }
      }
    }
  }

  return outlines
}
