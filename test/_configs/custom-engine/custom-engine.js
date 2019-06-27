module.exports = class CustomEngine {
  constructor() {
    this.markdown = {
      set: jest.fn(),
    }

    this.themeSet = { getThemeProp: jest.fn() }
    this.use = jest.fn(() => this)
  }

  render() {
    return { html: '<b>custom</b>', css: '/* custom */' }
  }
}
