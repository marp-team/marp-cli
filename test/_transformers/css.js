module.exports = {
  process: (src) => ({
    code: `module.exports = ${JSON.stringify(src)};`,
  }),
}
