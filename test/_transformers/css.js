module.exports = {
  process: (src) => `module.exports = ${JSON.stringify(src)};`,
}
