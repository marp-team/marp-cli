const d = document

export const isEnabled = () =>
  !!(d.fullscreenEnabled || d['webkitFullscreenEnabled'])

export const isFullscreen = () =>
  !!(d.fullscreenElement || d['webkitFullscreenElement'])

export const enter = (target = d.body): void | Promise<void> =>
  (target.requestFullscreen || target['webkitRequestFullscreen'])?.call(target)

export const exit = (): void | Promise<void> =>
  (d.exitFullscreen || d['webkitExitFullscreen'])?.call(d)

export const toggle = async () => (isFullscreen() ? exit() : enter())

export const onChange = (callback: () => void) => {
  for (const prefix of ['', 'webkit']) {
    d.addEventListener(prefix + 'fullscreenchange', callback)
  }
}
