const reconnectMs = 5000

const connect = (path: string, reconnect = false) => {
  const ws = new WebSocket(path)

  ws.addEventListener('open', () => {
    console.info('[Marp CLI] Observing the change of file...')
    if (reconnect) location.reload()
  })
  ws.addEventListener('close', () => {
    console.warn(
      `[Marp CLI] WebSocket for file watcher was disconnected. Try re-connecting in ${reconnectMs}ms...`
    )
    setTimeout(() => connect(path, true), reconnectMs)
  })
  ws.addEventListener('message', (e) => {
    if (e.data === 'reload') location.reload()
  })

  return ws
}

export default function () {
  const wsPath = (window as any).__marpCliWatchWS
  if (wsPath) return connect(wsPath)
}
