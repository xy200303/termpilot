export interface EditorBuffer {
  text: string
  saved: string
  loaded: boolean
  error: string
}

const buffers = new Map<string, EditorBuffer>()

export function editorKey(sessionId: string, path: string): string {
  return `${sessionId}\n${path}`
}

export function readBuffer(key: string): EditorBuffer | undefined {
  return buffers.get(key)
}

export function writeBuffer(key: string, buffer: EditorBuffer): void {
  buffers.set(key, buffer)
}

export function dropBuffer(key: string): void {
  buffers.delete(key)
}
