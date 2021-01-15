export class Timer {
  private lastUpdate = new Date().getTime()
  private time = 0
  private isRunning = true

  private update() {
    if (!this.isRunning) return

    const now = new Date().getTime()
    this.time += now - this.lastUpdate
    this.lastUpdate = now
  }

  elapsed() {
    this.update()
    return this.time
  }

  start() {
    this.lastUpdate = new Date().getTime()
    this.isRunning = true
  }

  stop() {
    this.update()
    this.isRunning = false
  }

  restart() {
    this.time = 0
    this.start()
  }
}
