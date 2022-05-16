const autoprefixer = require('autoprefixer')
const cssnano = require('cssnano')
const postcssUrl = require('postcss-url')

const plugins = (opts = {}) => {
  const preserveEmptyDefinitions = opts.preserveEmptyDefinitions || false

  return [
    postcssUrl({
      filter: '**/assets/**/*.svg',
      encodeType: 'base64',
      url: 'inline',
    }),
    autoprefixer(),
    cssnano({
      preset: [
        'default',
        { autoprefixer: false, discardEmpty: !preserveEmptyDefinitions },
      ],
    }),
  ]
}

module.exports = Object.assign(() => ({ plugins: plugins() }), { plugins })
