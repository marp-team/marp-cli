const index = require.requireActual('../')

export = {
  ...index,
  bespokeJs: async () => '/* bespoke.js */',
}
