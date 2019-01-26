module.exports = {
  get enabled() {
    return true
  },
  onchange: jest.fn(),
  toggle: jest.fn(() => Promise.resolve()),
}
