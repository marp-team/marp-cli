const mkdirp = jest.fn().mockImplementation((_, callback) => callback())

export default mkdirp
