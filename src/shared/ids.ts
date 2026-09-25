function shortId(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 保存的连接。改名、改备注都不换这个编号。 */
export function newConnId(): string {
  return `conn-${shortId()}`
}

/** 已经打开的终端。界面打开、助手打开、反向连入都用这一个前缀。 */
export function newTermId(): string {
  return `term-${shortId()}`
}

export function isConnId(value: string): boolean {
  return /^conn-[0-9a-f]{8}$/i.test(value.trim())
}

export function isTermId(value: string): boolean {
  return /^term-[0-9a-f]{8}$/i.test(value.trim())
}
