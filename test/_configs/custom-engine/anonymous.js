const { Marpit } = require('@marp-team/marpit')

module.exports = {
  engine: jest.fn(opts => new Marpit(opts)),
  options: { customOption: true },
}
