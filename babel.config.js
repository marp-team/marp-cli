// This setting is used only to transform ESM while running Jest.
module.exports = {
  presets: [['@babel/env', { targets: { node: 'current' } }]],
  plugins: [
    [
      'transform-rename-import',
      {
        replacements: [
          { original: '^node:(.+)$', replacement: '$1' },
          { original: '^#(.+)$', replacement: '$1' }, // "#"" prefix is used by chalk
        ],
      },
    ],
  ],
}
