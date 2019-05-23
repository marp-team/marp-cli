const wrapAnsi = jest.fn().mockImplementation(m => m) // No ops

export default wrapAnsi
