// This setting is used only to transform ESM while running Jest.
module.exports = {
  presets: [['@babel/env', { targets: { node: 'current' } }]],
  plugins: [
    ['transform-rename-import', { original: '^node:(.+)$', replacement: '$1' }],
  ],
}
