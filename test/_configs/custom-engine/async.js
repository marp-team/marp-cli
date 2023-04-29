module.exports = {
  engine: async () => (await import('./custom-engine.js')).default,
}
