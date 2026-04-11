/**
 * markdown-it plugin that renders Mermaid code blocks as diagram containers.
 *
 * Fenced code blocks with the `mermaid` language tag are converted to
 * `<div class="mermaid">` elements. A companion browser-side script
 * (`lib/mermaid.js`) picks them up and renders SVG diagrams at runtime.
 */

export const mermaidEnabled = Symbol('mermaidEnabled')

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default function mermaidPlugin(md: any) {
  const { marpit } = md

  const defaultFence =
    md.renderer.rules.fence ||
    function (tokens: any[], idx: number, options: any, _env: any, slf: any) {
      const token = tokens[idx]
      const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
      const langName = info.split(/(\s+)/g)[0]
      const highlighted = options.highlight
        ? options.highlight(token.content, langName, '')
        : escapeHtml(token.content)

      return `<pre${slf.renderAttrs(token)}><code class="${
        info ? `language-${langName}` : ''
      }">${highlighted}</code></pre>\n`
    }

  md.renderer.rules.fence = (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    slf: any
  ) => {
    const token = tokens[idx]
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
    const lang = info.split(/(\s+)/g)[0].toLowerCase()

    if (lang === 'mermaid') {
      marpit[mermaidEnabled] = true
      return `<div class="mermaid">${escapeHtml(token.content)}</div>\n`
    }

    return defaultFence(tokens, idx, options, env, slf)
  }
}
