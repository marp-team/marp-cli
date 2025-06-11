import { Marp } from '@marp-team/marp-core'
import { Marpit } from '@marp-team/marpit'
import MarkdownIt from 'markdown-it'
import infoPlugin, { engineInfo } from '../../src/engine/info-plugin'
import metaPlugin from '../../src/engine/meta-plugin'

describe('Engine info plugin', () => {
  // Helper to create mock heading tokens
  const createHeadingTokens = (tag: string, content: string) => [
    {
      type: 'heading_open',
      tag,
      attrs: null,
      map: [0, 1],
      nesting: 1,
      level: 0,
      children: null,
      content: '',
      markup: '#',
      info: '',
      meta: null,
      block: true,
      hidden: false,
    },
    {
      type: 'inline',
      tag: '',
      attrs: null,
      map: [0, 1],
      nesting: 0,
      level: 1,
      children: [],
      content,
      markup: '',
      info: '',
      meta: null,
      block: true,
      hidden: false,
    },
    {
      type: 'heading_close',
      tag,
      attrs: null,
      map: null,
      nesting: -1,
      level: 0,
      children: null,
      content: '',
      markup: '#',
      info: '',
      meta: null,
      block: true,
      hidden: false,
    },
  ]

  describe('#infoPlugin title extraction', () => {
    const marpitMock = () => ({
      customDirectives: { global: {} },
      themeSet: {
        default: { name: 'default' },
        getThemeProp: jest.fn(() => 1080),
      },
      options: { lang: 'en' },
    })

    const mdMock = () => ({
      core: { ruler: { push: jest.fn() } },
      marpit: marpitMock(),
    })

    // Test cases for title extraction behavior
    it('returns undefined when there are no tokens', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = { inlineMode: false, tokens: [] }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBeUndefined()
    })

    it('returns undefined when there are no heading tokens', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: [
          { type: 'paragraph_open' },
          { type: 'inline', content: 'Hello world' },
          { type: 'paragraph_close' },
        ],
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBeUndefined()
    })

    it('extracts title from a single heading token', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: createHeadingTokens('h1', 'Slide Title'),
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBe('Slide Title')
    })

    it('extracts title from the highest hierarchy heading', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: [
          ...createHeadingTokens('h2', 'Secondary Title'),
          ...createHeadingTokens('h1', 'Main Title'),
          ...createHeadingTokens('h3', 'Tertiary Title'),
        ],
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBe('Main Title')
    })

    it('extracts title from the first highest heading when multiple exist', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: [
          ...createHeadingTokens('h2', 'First Section'),
          ...createHeadingTokens('h1', 'First Main Title'),
          ...createHeadingTokens('h1', 'Second Main Title'),
        ],
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBe('First Main Title')
    })

    it('ignores malformed heading tokens missing content', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: [
          {
            type: 'heading_open',
            tag: 'h1',
          },
          // Missing inline content token
          {
            type: 'heading_close',
            tag: 'h1',
          },
          ...createHeadingTokens('h2', 'Secondary Title'),
        ],
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBe('Secondary Title')
    })

    it('trims whitespace from heading content', () => {
      const md = mdMock()
      infoPlugin(md)

      const infoRule = md.core.ruler.push.mock.calls[0][1]
      const state = {
        inlineMode: false,
        tokens: createHeadingTokens('h1', '  Title with spaces  '),
      }

      infoRule(state)

      expect(md.marpit[engineInfo].title).toBe('Title with spaces')
    })
  })

  describe('Marp CLI info plugin', () => {
    it('stores info to marp[engineInfo] after rendered', () => {
      const marp = new Marp().use(infoPlugin)
      expect(marp[engineInfo]).toBeUndefined()

      marp.render('')
      expect(marp[engineInfo]).toBeDefined()
    })

    it('works with Marpit instance', () => {
      const marpit = new Marpit().use(infoPlugin)
      expect(marpit[engineInfo]).toBeUndefined()

      marpit.render('')
      expect(marpit[engineInfo]).toBeDefined()
    })

    it('does not store info when rendered by inline mode', () => {
      const marp = new Marp().use(infoPlugin)
      expect(marp[engineInfo]).toBeUndefined()

      const md: MarkdownIt = marp.markdown
      md.renderInline('# Hello')
      expect(marp[engineInfo]).toBeUndefined()
    })

    describe('with meta plugin', () => {
      const instanceWithMeta = () => new Marp().use(infoPlugin).use(metaPlugin)

      it('stores parsed info from global directives', () => {
        const marp = instanceWithMeta()

        marp.render(
          `
---
title: Title
author: Author
description: Description
keywords:
  - keyword1
  - keyword2
url: https://example.com/slide
image: https://example.com/slide.png
lang: en
theme: gaia
size: 4:3
---

# Slide title

---

## Page 2
`.trim()
        )

        expect(marp[engineInfo]).toMatchInlineSnapshot(`
{
  "author": "Author",
  "description": "Description",
  "image": "https://example.com/slide.png",
  "keywords": [
    "keyword1",
    "keyword2",
  ],
  "lang": "en",
  "length": 2,
  "size": {
    "height": 720,
    "width": 960,
  },
  "theme": "gaia",
  "title": "Title",
  "url": "https://example.com/slide",
}
`)
      })
    })
  })
})
