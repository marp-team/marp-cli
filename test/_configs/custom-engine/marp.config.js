class CustomEngine {
  constructor() {
    this.markdown = {
      set: jest.fn(),
    }

    this.themeSet = {}
  }

  render() {
    return { html: '<b>custom</b>', css: '/* custom */' }
  }
}

module.exports = {
  engine: CustomEngine,
}
