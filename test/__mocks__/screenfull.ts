module.exports = {
  get isEnabled() {
    return true
  },
  onchange: jest.fn(),
  toggle: jest.fn(() => Promise.resolve()),
}
