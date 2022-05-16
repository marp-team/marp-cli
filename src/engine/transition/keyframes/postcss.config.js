const { plugins } = require('../../../../postcss.config')

module.exports = () => ({
  plugins: plugins({ preserveEmptyDefinitions: true }),
})
