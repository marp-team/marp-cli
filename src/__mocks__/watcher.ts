const watcher = jest.requireActual('../watcher')

if (watcher.notifier) {
  watcher.notifier.start = jest.fn()
  watcher.notifier.sendTo = jest.fn()
}

module.exports = watcher
