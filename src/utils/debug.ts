import dbg from 'debug'

export const debug = dbg('marp-cli')
export const debugConfig = dbg('marp-cli:config')
export const debugBrowser = dbg('marp-cli:browser')
export const debugBrowserFinder = dbg('marp-cli:browser:finder')
export const debugEngine = dbg('marp-cli:engine')
export const debugPreview = dbg('marp-cli:preview')
export const debugWatcher = dbg('marp-cli:watcher')
export const debugWatcherWS = dbg('marp-cli:watcher:ws')
