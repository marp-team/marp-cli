const pug = require('pug')

module.exports = {
  process: src => `
module.exports = (locals) => {
  const pug = require('pug').runtime;
  ${pug.compile(src).toString()}
  return template(locals);
};`,
}
