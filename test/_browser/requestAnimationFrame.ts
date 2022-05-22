Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn((callback) => {
    setTimeout(callback, 0)
  }),
})
