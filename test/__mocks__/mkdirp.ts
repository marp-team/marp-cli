const mkdirp = jest.fn().mockImplementation(path => Promise.resolve(path))

export default mkdirp
