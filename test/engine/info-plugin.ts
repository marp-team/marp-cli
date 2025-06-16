import { Marp } from '@marp-team/marp-core'
import { Marpit } from '@marp-team/marpit'
import MarkdownIt from 'markdown-it'
import infoPlugin, { engineInfo } from '../../src/engine/info-plugin'
import metaPlugin from '../../src/engine/meta-plugin'

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
