const watcher = require.requireActual('../watcher')

watcher.notifier.start = jest.fn()
watcher.notifier.sendTo = jest.fn()

export = watcher
