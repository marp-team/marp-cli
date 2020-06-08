const watcher = jest.requireActual('../watcher')

watcher.notifier.start = jest.fn()
watcher.notifier.sendTo = jest.fn()

export = watcher
