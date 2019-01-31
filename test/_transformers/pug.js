const pug = require('pug')

module.exports = {
  process: (src, filename) => `
module.exports = (locals) => {
  const pug = require('pug').runtime;
  ${pug.compile(src, { filename }).toString()}
  return template(locals);
};`,
}
