module.exports = {
  get enabled() {
    return true
  },
  toggle: jest.fn(() => Promise.resolve()),
}
