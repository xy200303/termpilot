import type { RecordStart } from '../../../shared/types'

/**
 * 应用窗口录屏。
 * 主进程用 webContents.getMediaSourceId() 给出本窗口的媒体源 id，
 * 这里用 desktop 采集约束拿到画面，MediaRecorder 编码成 WebM。
 * 不采音频；同一时间只允许一个录制任务。
 */

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let autoTimer: number | undefined
let job: RecordStart | null = null
let finishing = false

const mimeOf = (rec: MediaRecorder): string => rec.mimeType || 'video/webm'

function release(): void {
  window.clearTimeout(autoTimer)
  autoTimer = undefined
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  recorder = null
  chunks = []
  job = null
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function stopAndCollect(): Promise<{ data: Uint8Array; mime: string }> {
  const rec = recorder
  if (!rec) return Promise.reject(new Error('没有正在进行的录屏'))
  return new Promise((resolve, reject) => {
    const collect = async () => {
      try {
        const blob = new Blob(chunks, { type: mimeOf(rec) })
        resolve({ data: new Uint8Array(await blob.arrayBuffer()), mime: mimeOf(rec) })
      } catch (error) {
        reject(error)
      }
    }
    if (rec.state === 'inactive') {
      void collect()
      return
    }
    rec.onstop = () => void collect()
    try {
      rec.stop()
    } catch (error) {
      reject(error)
    }
  })
}

async function finish(auto: boolean): Promise<void> {
  if (finishing || !recorder || !job) return
  finishing = true
  const id = job.id
  try {
    const out = await stopAndCollect()
    window.api.record.reply({ id, phase: 'data', data: out.data, mime: out.mime, auto })
  } catch (error) {
    window.api.record.reply({ id, phase: 'error', error: errorText(error) })
  } finally {
    finishing = false
    release()
  }
}

export async function startRecording(next: RecordStart): Promise<void> {
  release()
  const media = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: next.sourceId,
        maxFrameRate: next.fps,
        minFrameRate: 1
      }
    }
  } as unknown as MediaStreamConstraints)
  stream = media
  job = next
  chunks = []
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  )
  recorder = new MediaRecorder(media, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 6_000_000
  })
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start(1000)
  autoTimer = window.setTimeout(() => void finish(true), next.maxSeconds * 1000)
  window.api.record.reply({ id: next.id, phase: 'started' })
}

export function stopRecording(): void {
  void finish(false)
}
