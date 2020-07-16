let cachedWakeLockApi: any = undefined

type WakeLockObject = EventTarget | null

export const wakeLockApi: any = () => {
  if (cachedWakeLockApi === undefined) {
    cachedWakeLockApi = 'wakeLock' in navigator && navigator['wakeLock']
  }
  return cachedWakeLockApi
}

export const requestWakeLock = async (): Promise<WakeLockObject> => {
  const api = wakeLockApi()

  if (api) {
    try {
      const wakeLock: EventTarget = await api.request('screen')
      wakeLock.addEventListener('release', () => {
        console.debug('[Marp CLI] Wake Lock was released')
      })

      console.debug('[Marp CLI] Wake Lock is active')
      return wakeLock
    } catch (e) {
      console.warn(e)
    }
  }

  return null
}

// tslint:disable-next-line:variable-name
export const _clearCachedWakeLockApi = () => {
  cachedWakeLockApi = undefined
}

export default async function bespokeWakeLock() {
  if (!wakeLockApi()) return

  let wakeLock: WakeLockObject

  const handleVisibilityChange = () => {
    if (wakeLock && document.visibilityState === 'visible') requestWakeLock()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('fullscreenchange', handleVisibilityChange)

  wakeLock = await requestWakeLock()
  return wakeLock
}
