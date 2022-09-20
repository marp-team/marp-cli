module.exports = {
  process: (src) => {
    const uri = `data:image/png;base64,${Buffer.from(src).toString('base64')}`
    return { code: `module.exports = ${JSON.stringify(uri)};` }
  },
}
