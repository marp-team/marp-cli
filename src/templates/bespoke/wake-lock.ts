export default function bespokeWakeLock() {
  if (!('wakeLock' in navigator)) return

  let wakeLock: any
  const wakeLockApi: any = navigator['wakeLock']

  const requestWakeLock = async () => {
    try {
      wakeLock = await wakeLockApi.request('screen')
      wakeLock.addEventListener('release', () => {
        console.debug('[Marp CLI] Wake Lock was released')
      })
      console.debug('[Marp CLI] Wake Lock is active')
    } catch (e) {
      console.warn(e)
    }
  }

  const handleVisibilityChange = () => {
    if (wakeLock && document.visibilityState === 'visible') {
      requestWakeLock()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('fullscreenchange', handleVisibilityChange)

  requestWakeLock()
}
