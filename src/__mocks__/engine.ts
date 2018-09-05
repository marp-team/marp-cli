const engine = require.requireActual('../engine')

export const { ResolvedEngine } = engine

ResolvedEngine.prototype.findClassPath = jest.fn()

export default ResolvedEngine.resolve
