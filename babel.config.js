// This setting is used only to transform ESM while running Jest.
module.exports = {
  presets: [['@babel/env', { targets: { node: 'current' } }]],
  plugins: [['babel-plugin-transform-import-meta', { module: 'ES6' }]],
}
