const getStdin = Object.assign(async () => '', {
  buffer: async () => Buffer.from(''),
})

export default getStdin
