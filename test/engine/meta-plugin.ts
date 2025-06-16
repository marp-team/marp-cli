import { Marp } from '@marp-team/marp-core'
import type MarkdownIt from 'markdown-it'
import * as cli from '../../src/cli'
import metaPlugin from '../../src/engine/meta-plugin'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Marp CLI meta plugin', () => {
  it('defines custom directives for Marp CLI metadata support', () => {
    const marp = new Marp().use(metaPlugin)

    expect(marp.customDirectives.global).toMatchObject({
      author: expect.any(Function),
      description: expect.any(Function),
      image: expect.any(Function),
      keywords: expect.any(Function),
      title: expect.any(Function),
      url: expect.any(Function),
    })
  })

  describe('Custom directive transformers', () => {
    const transformer = (globalDirective: string) => {
      const marp = new Marp().use(metaPlugin)
      return marp.customDirectives.global[globalDirective]
    }

    describe('#author', () => {
      const author = transformer('author')

      it('returns an object with marpCLIAuthor property when given a string', () => {
        expect(author('test')).toEqual({ marpCLIAuthor: 'test' })
      })

      it('returns an empty object when given a non-string value', () => {
        // @ts-expect-error Invalid type
        expect(author(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(author(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(author(undefined)).toEqual({})

        expect(author({ author: 'author' })).toEqual({})
        expect(author([])).toEqual({})
        expect(author(['abc'])).toEqual({})
      })
    })

    describe('#description', () => {
      const description = transformer('description')

      it('returns an object with marpCLIDescription property when given a string', () => {
        expect(description('test')).toEqual({ marpCLIDescription: 'test' })
      })

      it('returns an empty object when given a non-string value', () => {
        // @ts-expect-error Invalid type
        expect(description(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(description(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(description(undefined)).toEqual({})

        expect(description({ description: 'description' })).toEqual({})
        expect(description([])).toEqual({})
        expect(description(['abc'])).toEqual({})
      })
    })

    describe('#image', () => {
      const image = transformer('image')

      it('returns an object with marpCLIImage property when given a string', () => {
        expect(image('image.png')).toEqual({ marpCLIImage: 'image.png' })
      })

      it('returns an empty object when given a non-string value', () => {
        // @ts-expect-error Invalid type
        expect(image(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(image(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(image(undefined)).toEqual({})

        expect(image({ image: 'image.png' })).toEqual({})
        expect(image([])).toEqual({})
        expect(image(['image.png'])).toEqual({})
      })
    })

    describe('#keywords', () => {
      const keywords = transformer('keywords')

      it('returns an object with marpCLIKeywords property that is having array of strings', () => {
        expect(keywords('keyword')).toEqual({ marpCLIKeywords: ['keyword'] })

        // Trimming whitespace
        expect(keywords('   keyword\t ')).toEqual({
          marpCLIKeywords: ['keyword'],
        })

        // Comma-separated keywords
        expect(keywords('keyword1, keyword2')).toEqual({
          marpCLIKeywords: ['keyword1', 'keyword2'],
        })

        // Deduplicating keywords
        expect(keywords('keyword1, keyword2, keyword1')).toEqual({
          marpCLIKeywords: ['keyword1', 'keyword2'],
        })
      })

      it('returns an object with marpCLIKeywords property when given array of strings', () => {
        expect(keywords(['keyword1', 'keyword2'])).toEqual({
          marpCLIKeywords: ['keyword1', 'keyword2'],
        })

        // Skipped trimming whitespaces when given array
        expect(keywords([' keyword1 ', '  keyword2  '])).toEqual({
          marpCLIKeywords: [' keyword1 ', '  keyword2  '],
        })

        // Comma-included keywords
        expect(keywords(['keyword1,keyword2', 'keyword3'])).toEqual({
          marpCLIKeywords: ['keyword1,keyword2', 'keyword3'],
        })

        // Deduplicating keywords in array
        expect(keywords(['keyword1', 'keyword2', 'keyword1'])).toEqual({
          marpCLIKeywords: ['keyword1', 'keyword2'],
        })

        // Filters only valid strings
        expect(keywords(['keyword1', 123, null, 'keyword2'])).toEqual({
          marpCLIKeywords: ['keyword1', 'keyword2'],
        })
      })

      it('returns an empty object when given invalid keywords', () => {
        // @ts-expect-error Invalid type
        expect(keywords(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(keywords(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(keywords(undefined)).toEqual({})

        expect(keywords({ keywords: ['keyword'] })).toEqual({})
        expect(keywords({ keywords: 'keyword' })).toEqual({})
        expect(keywords([])).toEqual({})

        expect(
          keywords([
            123,
            null,
            undefined,
            { keywords: 'keyword' },
            { keywords: ['keyword'] },
          ])
        ).toEqual({})
      })
    })

    describe('#title', () => {
      const title = transformer('title')

      it('returns an object with marpCLITitle property when given a string', () => {
        expect(title('title')).toEqual({ marpCLITitle: 'title' })
      })

      it('returns an empty object when given a non-string value', () => {
        // @ts-expect-error Invalid type
        expect(title(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(title(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(title(undefined)).toEqual({})

        expect(title({ title: 'title' })).toEqual({})
        expect(title([])).toEqual({})
        expect(title(['title'])).toEqual({})
      })
    })

    describe('#url', () => {
      beforeEach(() => jest.spyOn(cli, 'warn').mockImplementation())

      const url = transformer('url')

      it('returns an object with marpCLIURL property when given valid URL', () => {
        expect(url('https://example.com')).toEqual({
          marpCLIURL: 'https://example.com',
        })
        expect(url('https://example.com/foo/bar?foo=bar#hash')).toEqual({
          marpCLIURL: 'https://example.com/foo/bar?foo=bar#hash',
        })
        expect(url('ftp://example.com/foo/bar')).toEqual({
          marpCLIURL: 'ftp://example.com/foo/bar',
        })
      })

      it('returns an empty object when given invalid URL', () => {
        // @ts-expect-error Invalid type
        expect(url(123)).toEqual({})

        // @ts-expect-error Invalid type
        expect(url(null)).toEqual({})

        // @ts-expect-error Invalid type
        expect(url(undefined)).toEqual({})

        expect(url({ url: 'https://example.com' })).toEqual({})
        expect(url([])).toEqual({})
        expect(url(['https://example.com'])).toEqual({})

        // Invalid URL formats
        expect(url('invalid-url')).toEqual({})
        expect(url('no-protocol.example.com')).toEqual({})
        expect(url('/relative')).toEqual({})
        expect(url('?only_query')).toEqual({})
      })
    })
  })

  describe('Title detection rule', () => {
    const getTitle = (marp: Marp) => {
      // @ts-expect-error Accessing protected property
      return marp.lastGlobalDirectives?.marpCLITitle
    }

    it('automatically detects title from headings when title global directive is not specified', () => {
      const marp = new Marp().use(metaPlugin)
      marp.render('# Slide title')

      expect(getTitle(marp)).toBe('Slide title')
    })

    it('does not detect title when parsed as inline', () => {
      const marp = new Marp().use(metaPlugin)
      marp.markdown.renderInline('# Slide title')

      expect(getTitle(marp)).toBeUndefined()
    })

    it('does not use automatically detected title if title global directive is specified', () => {
      const marp = new Marp().use(metaPlugin)
      marp.render('# Heading <!-- title: Title -->')

      expect(getTitle(marp)).toBe('Title')
    })

    it('does not detect title when title global directive is not specified but there are no headings', () => {
      const marp = new Marp().use(metaPlugin)
      marp.render('Slide title')

      expect(getTitle(marp)).toBeUndefined()
    })

    it('prioritizes the first highest heading for title detection', () => {
      const marp = new Marp().use(metaPlugin)
      marp.render(
        `
### Heading 3

---

# Heading 1

---

# Heading 1-2
## Heading 2
      `.trim()
      )

      expect(getTitle(marp)).toBe('Heading 1')
    })

    it('trims whitespaces from detected title', () => {
      const marp = new Marp().use(metaPlugin)
      marp.render('# \t\tSlide title\t ')

      expect(getTitle(marp)).toBe('Slide title')
    })

    it('makes accessible a detected title from other injected plugins', () => {
      expect.hasAssertions()

      const marp = new Marp().use(metaPlugin).use((md: MarkdownIt) => {
        md.core.ruler.push('test_title_detection', (state) => {
          const slide = state.tokens.find(
            ({ type }) => type === 'marpit_slide_open'
          )
          expect(slide?.meta.marpitDirectives.marpCLITitle).toBe('Slide title')
        })
      })

      marp.render('# Slide title')
    })

    // TODO: Following tests are currently failing. Use `renderInline()` to get the actual content of Markdown's inline token.
    it.failing(
      'renders alternative text as a title when used images in heading',
      () => {
        const marp = new Marp().use(metaPlugin)
        marp.render('# ![Alternative text](image.png)')

        expect(getTitle(marp)).toBe('Alternative text')
      }
    )

    it.failing(
      'renders emoji text as a title when used images in heading',
      () => {
        const marp = new Marp().use(metaPlugin)
        marp.render('# :apple: Emoji 🍎')

        expect(getTitle(marp)).toBe('🍎 Emoji 🍎')
      }
    )

    it.failing(
      'renders inline contents within markup and HTML as a title',
      () => {
        const marp = new Marp().use(metaPlugin)
        marp.render('# **Strong** and <em>emphasized</em> text')

        expect(getTitle(marp)).toBe('Strong and emphasized text')
      }
    )
  })
})
