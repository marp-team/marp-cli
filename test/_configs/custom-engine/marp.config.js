class CustomEngine {
  constructor() {
    this.markdown = {
      set: jest.fn(),
    }
  }

  render() {
    return { html: '<b>custom</b>', css: '/* custom */' }
  }
}

module.exports = {
  engine: CustomEngine,
}
