export default function() {
  const wsPath = (<any>window).__marpCliWatchWS

  if (wsPath) {
    const ws = new WebSocket(wsPath)
    ws.addEventListener('message', e => {
      if (e.data === 'reload') location.reload()
    })
  }
}
