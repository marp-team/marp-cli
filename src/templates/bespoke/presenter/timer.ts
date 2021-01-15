export class Timer {
  private lastUpdate: number = new Date().getTime()
  private time: number = 0
  private isRunning: boolean = true

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
