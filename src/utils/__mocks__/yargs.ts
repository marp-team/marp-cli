const watcher = jest.requireActual('../yargs')
const { createYargs } = watcher

watcher.createYargs = (...opts) => createYargs(...opts).locale('en')

export = watcher
