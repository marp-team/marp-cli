// This setting is used only to transform ESM while running Jest.
module.exports = {
  presets: [
    ['@babel/env', { targets: { node: 'current' } }],
    ['@babel/preset-typescript', { allowDeclareFields: true }],
    ['@babel/preset-react', { pragma: 'h', pragmaFrag: 'Fragment' }],
  ],
}
