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
      return await api.request('screen')
    } catch (e: unknown) {
      console.warn(e)
    }
  }

  return null
}

export const _clearCachedWakeLockApi = () => {
  cachedWakeLockApi = undefined
}

const bespokeWakeLock = async () => {
  if (!wakeLockApi()) return

  let wakeLock: WakeLockObject | undefined // eslint-disable-line prefer-const

  const handleVisibilityChange = () => {
    if (wakeLock && document.visibilityState === 'visible') requestWakeLock()
  }

  for (const event of ['visibilitychange', 'fullscreenchange'] as const) {
    document.addEventListener(event, handleVisibilityChange)
  }

  wakeLock = await requestWakeLock()
  return wakeLock
}

export default bespokeWakeLock
