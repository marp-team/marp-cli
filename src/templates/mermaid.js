/**
 * Browser-side Mermaid initializer for marp-cli.
 *
 * This script is bundled by Rollup and injected into the HTML output when
 * the presentation contains Mermaid code blocks. It runs inside the browser
 * (either the end-user's browser for HTML export, or Puppeteer for
 * PDF/PNG/PPTX export) and converts `.mermaid` divs into rendered SVGs.
 *
 * After all diagrams have been rendered, `window.__mermaidRendered` is set
 * to `true` so that the Puppeteer exporter can reliably wait for completion.
 */
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
})

const render = async () => {
  const elements = document.querySelectorAll('.mermaid')

  if (elements.length > 0) {
    try {
      await mermaid.run({ nodes: Array.from(elements) })
    } catch (e) {
      console.error('[marp-cli] Mermaid rendering failed:', e)
    }
  }

  window.__mermaidRendered = true
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render)
} else {
  render()
}
