import infoPlugin, { engineInfo } from '../../src/engine/info-plugin'

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
            ]
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
            tokens: createHeadingTokens('h1', 'Slide Title')
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
            ]
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
            ]
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
            ]
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
            tokens: createHeadingTokens('h1', '  Title with spaces  ')
        }
        
        infoRule(state)
        
        expect(md.marpit[engineInfo].title).toBe('Title with spaces')
        })
    })

    describe('#infoPlugin', () => {
        const marpitMock = () => {
        const marpit = {
            customDirectives: { global: {} },
            themeSet: {
            default: { name: 'default' },
            getThemeProp: jest.fn(() => 1080),
            },
            options: { lang: 'en' },
        }
        return marpit
        }

        const mdMock = () => {
        const md: any = {
            core: { ruler: { push: jest.fn() } },
            marpit: marpitMock(),
        }
        return md
        }

        it('adds marp_cli_info ruler to markdown-it', () => {
        const md = mdMock()
        infoPlugin(md)
        
        expect(md.core.ruler.push).toHaveBeenCalledWith(
            'marp_cli_info',
            expect.any(Function)
        )
        })

        it('returns early when in inline mode', () => {
        const md = mdMock()
        infoPlugin(md)
        
        const infoRule = md.core.ruler.push.mock.calls[0][1]
        const state = { inlineMode: true }
        
        expect(infoRule(state)).toBeUndefined()
        expect(md.marpit[engineInfo]).toBeUndefined()
        })

        it('uses global directive title when available', () => {
        const md = mdMock()
        md.marpit.lastGlobalDirectives = { marpCLITitle: 'Title from Directive' }
        
        infoPlugin(md)
        
        const infoRule = md.core.ruler.push.mock.calls[0][1]
        const state = { 
            inlineMode: false,
            tokens: createHeadingTokens('h1', 'Heading Title')
        }
        
        infoRule(state)
        
        expect(md.marpit[engineInfo].title).toBe('Title from Directive')
        })

        it('counts slides correctly', () => {
        const md = mdMock()
        infoPlugin(md)
        
        const infoRule = md.core.ruler.push.mock.calls[0][1]
        const state = { 
            inlineMode: false,
            tokens: [
            { type: 'slide_open', meta: { marpitSlideElement: 1 } },
            ...createHeadingTokens('h1', 'Slide 1'),
            { type: 'slide_close' },
            { type: 'slide_open', meta: { marpitSlideElement: 1 } },
            ...createHeadingTokens('h2', 'Slide 2'),
            { type: 'slide_close' },
            ]
        }
        
        infoRule(state)
        
        expect(md.marpit[engineInfo]).toHaveLength(2)
        })

        it('sets all info properties correctly', () => {
        const md = mdMock()
        md.marpit.lastGlobalDirectives = { 
            theme: 'gaia',
            marpCLITitle: 'Presentation Title',
            marpCLIAuthor: 'Author Name',
            marpCLIDescription: 'Description text',
            marpCLIImage: 'image.png',
            marpCLIKeywords: ['key1', 'key2'],
            marpCLIURL: 'https://example.com',
            lang: 'es'
        }
        
        infoPlugin(md)
        
        const infoRule = md.core.ruler.push.mock.calls[0][1]
        const state = { inlineMode: false, tokens: [] }
        
        infoRule(state)
        
        const info = md.marpit[engineInfo]
        expect(info).toMatchObject({
            theme: 'gaia',
            title: 'Presentation Title',
            author: 'Author Name',
            description: 'Description text',
            image: 'image.png',
            keywords: ['key1', 'key2'],
            url: 'https://example.com',
            lang: 'es',
            length: 0,
            size: {
            height: 1080,
            width: 1080
            }
        })
        })
    })
})
