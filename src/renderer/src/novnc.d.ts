declare module '@novnc/novnc' {
  export default class RFB {
    constructor(
      target: HTMLElement,
      url: string,
      options?: { credentials?: { username?: string; password?: string }; shared?: boolean }
    )
    scaleViewport: boolean
    resizeSession: boolean
    clipViewport: boolean
    viewOnly: boolean
    qualityLevel: number
    compressionLevel: number
    addEventListener(type: string, listener: (event: CustomEvent<any>) => void): void
    sendCredentials(credentials: { username?: string; password?: string }): void
    focus(): void
    sendKey(keysym: number, code: string, down?: boolean): void
    clipboardPasteFrom(text: string): void
    toDataURL(type?: string, encoderOptions?: number): string
    disconnect(): void
  }
}
