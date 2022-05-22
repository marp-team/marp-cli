const pug = require('pug')

module.exports = {
  process: (src, filename) => ({
    code: `
module.exports = (locals) => {
  const pug = require('pug').runtime;
  ${pug.compile(src, { filename }).toString()}
  return template(locals);
};`,
  }),
}
