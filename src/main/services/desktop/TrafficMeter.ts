export interface TrafficSnapshot {
  bytesIn: number
  bytesOut: number
  kbpsIn: number
  kbpsOut: number
  packetsIn: number
  packetsOut: number
}

/** 桌面桥接的累计流量和最近一段时间的速率。 */
export class TrafficMeter {
  private bytesIn = 0
  private bytesOut = 0
  private windowIn = 0
  private windowOut = 0
  private packetsIn = 0
  private packetsOut = 0
  private windowPacketsIn = 0
  private windowPacketsOut = 0
  private windowAt = Date.now()
  private rateIn = 0
  private rateOut = 0
  private packetRateIn = 0
  private packetRateOut = 0

  addIn(bytes: number): void {
    this.bytesIn += bytes
    this.windowIn += bytes
    this.packetsIn += 1
    this.windowPacketsIn += 1
  }

  addOut(bytes: number): void {
    this.bytesOut += bytes
    this.windowOut += bytes
    this.packetsOut += 1
    this.windowPacketsOut += 1
  }

  snapshot(): TrafficSnapshot {
    const now = Date.now()
    const elapsed = now - this.windowAt
    if (elapsed >= 250) {
      this.rateIn = (this.windowIn * 8) / elapsed
      this.rateOut = (this.windowOut * 8) / elapsed
      this.packetRateIn = (this.windowPacketsIn * 1000) / elapsed
      this.packetRateOut = (this.windowPacketsOut * 1000) / elapsed
      this.windowAt = now
      this.windowIn = 0
      this.windowOut = 0
      this.windowPacketsIn = 0
      this.windowPacketsOut = 0
    }
    return {
      bytesIn: this.bytesIn,
      bytesOut: this.bytesOut,
      kbpsIn: Math.round(this.rateIn * 10) / 10,
      kbpsOut: Math.round(this.rateOut * 10) / 10,
      packetsIn: Math.round(this.packetRateIn),
      packetsOut: Math.round(this.packetRateOut)
    }
  }
}
