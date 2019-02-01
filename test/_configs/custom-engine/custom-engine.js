module.exports = class CustomEngine {
  constructor() {
    this.markdown = {
      set: jest.fn(),
    }

    this.themeSet = { getThemeProp: jest.fn() }
    this.use = jest.fn()
  }

  render() {
    return { html: '<b>custom</b>', css: '/* custom */' }
  }
}
