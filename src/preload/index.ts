import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  CaptureRect,
  CaptureReply,
  CaptureRun,
  AgentId,
  AgentTarget,
  McpAuditEntry,
  McpConfirmRequest,
  McpOpenTab,
  McpRuntime,
  RemoteFile,
  SftpInstallEvent,
  ReverseIncoming,
  ReverseListenState,
  Appearance,
  McpSettingsInput,
  SessionConfig,
  SessionInput,
  TermCreateOptions,
  TermDataEvent,
  TermLinesReply,
  TermLinesRun,
  TermModeReply,
  TermModeRun,
  TermStatusEvent,
  UpdateCheck
} from '../shared/types'

/**
 * 渲染进程唯一可见的 API 白名单。
 * 不暴露 ipcRenderer 本体，不暴露任何文件/进程能力。
 */
const api = {
  platform: process.platform,
  sessions: {
    list: () => ipcRenderer.invoke(IPC.sessionList),
    create: (input: SessionInput) => ipcRenderer.invoke(IPC.sessionCreate, input),
    update: (id: string, patch: SessionInput) => ipcRenderer.invoke(IPC.sessionUpdate, id, patch),
    delete: (id: string) => ipcRenderer.invoke(IPC.sessionDelete, id),
    duplicate: (id: string) => ipcRenderer.invoke(IPC.sessionDuplicate, id) as Promise<SessionConfig | null>,
    onChanged: (cb: (sessions: SessionConfig[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, sessions: SessionConfig[]) => cb(sessions)
      ipcRenderer.on(IPC.sessionChanged, listener)
      return () => {
        ipcRenderer.removeListener(IPC.sessionChanged, listener)
      }
    }
  },
  term: {
    create: (opts: TermCreateOptions) => ipcRenderer.invoke(IPC.termCreate, opts),
    input: (termId: string, data: string) => ipcRenderer.send(IPC.termInput, termId, data),
    resize: (termId: string, cols: number, rows: number) =>
      ipcRenderer.send(IPC.termResize, termId, cols, rows),
    close: (termId: string) => ipcRenderer.send(IPC.termClose, termId),
    /** 订阅终端输出，返回取消订阅函数 */
    onData: (cb: (termId: string, data: Uint8Array) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, p: TermDataEvent) => cb(p.termId, p.data)
      ipcRenderer.on(IPC.termData, listener)
      return () => {
        ipcRenderer.removeListener(IPC.termData, listener)
      }
    },
    /** 订阅终端状态变化，返回取消订阅函数 */
    onStatus: (cb: (e: TermStatusEvent) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, p: TermStatusEvent) => cb(p)
      ipcRenderer.on(IPC.termStatus, listener)
      return () => {
        ipcRenderer.removeListener(IPC.termStatus, listener)
      }
    },
    linesReply: (result: TermLinesReply) => ipcRenderer.send(IPC.termLinesReply, result),
    onLines: (cb: (job: TermLinesRun) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, job: TermLinesRun) => cb(job)
      ipcRenderer.on(IPC.termLines, listener)
      return () => {
        ipcRenderer.removeListener(IPC.termLines, listener)
      }
    },
    modeReply: (result: TermModeReply) => ipcRenderer.send(IPC.termModeReply, result),
    onMode: (cb: (job: TermModeRun) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, job: TermModeRun) => cb(job)
      ipcRenderer.on(IPC.termMode, listener)
      return () => {
        ipcRenderer.removeListener(IPC.termMode, listener)
      }
    }
  },
  sftp: {
    list: (sessionId: string, dir: string) =>
      ipcRenderer.invoke(IPC.sftpList, sessionId, dir) as Promise<{
        path: string
        entries: RemoteFile[]
      }>,
    mkdir: (sessionId: string, dir: string, name: string) =>
      ipcRenderer.invoke(IPC.sftpMkdir, sessionId, dir, name),
    remove: (sessionId: string, path: string, kind: RemoteFile['kind']) =>
      ipcRenderer.invoke(IPC.sftpRemove, sessionId, path, kind),
    upload: (sessionId: string, dir: string) =>
      ipcRenderer.invoke(IPC.sftpUpload, sessionId, dir) as Promise<number>,
    rename: (sessionId: string, from: string, to: string) =>
      ipcRenderer.invoke(IPC.sftpRename, sessionId, from, to),
    download: (sessionId: string, file: RemoteFile) =>
      ipcRenderer.invoke(IPC.sftpDownload, sessionId, file) as Promise<boolean>,
    read: (sessionId: string, path: string) =>
      ipcRenderer.invoke(IPC.sftpRead, sessionId, path) as Promise<string>,
    write: (sessionId: string, path: string, text: string) =>
      ipcRenderer.invoke(IPC.sftpWrite, sessionId, path, text),
    onInstall: (cb: (event: SftpInstallEvent) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, event: SftpInstallEvent) => cb(event)
      ipcRenderer.on(IPC.sftpInstall, listener)
      return () => {
        ipcRenderer.removeListener(IPC.sftpInstall, listener)
      }
    }
  },
  appearance: {
    get: () => ipcRenderer.invoke(IPC.appearanceGet) as Promise<Appearance>,
    save: (input: Appearance) => ipcRenderer.invoke(IPC.appearanceSave, input) as Promise<Appearance>
  },
  mcp: {
    get: () => ipcRenderer.invoke(IPC.mcpGet),
    audit: () => ipcRenderer.invoke(IPC.mcpAudit) as Promise<McpAuditEntry[]>,
    agents: () => ipcRenderer.invoke(IPC.mcpAgents) as Promise<AgentTarget[]>,
    applyAgent: (id: AgentId) => ipcRenderer.invoke(IPC.mcpApplyAgent, id) as Promise<AgentTarget>,
    save: (input: McpSettingsInput) => ipcRenderer.invoke(IPC.mcpSave, input),
    state: () => ipcRenderer.invoke(IPC.mcpState) as Promise<McpRuntime>,
    bound: (termId: string) => ipcRenderer.send(IPC.mcpBound, termId),
    confirm: (id: string, ok: boolean) => ipcRenderer.send(IPC.mcpConfirmReply, id, ok),
    onState: (cb: (state: McpRuntime) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: McpRuntime) => cb(state)
      ipcRenderer.on(IPC.mcpStateEvent, listener)
      return () => {
        ipcRenderer.removeListener(IPC.mcpStateEvent, listener)
      }
    },
    onOpenTab: (cb: (tab: McpOpenTab) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, tab: McpOpenTab) => cb(tab)
      ipcRenderer.on(IPC.mcpOpenTab, listener)
      return () => {
        ipcRenderer.removeListener(IPC.mcpOpenTab, listener)
      }
    },
    onCloseTab: (cb: (termId: string) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, termId: string) => cb(termId)
      ipcRenderer.on(IPC.mcpCloseTab, listener)
      return () => {
        ipcRenderer.removeListener(IPC.mcpCloseTab, listener)
      }
    },
    onConfirm: (cb: (request: McpConfirmRequest) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, request: McpConfirmRequest) => cb(request)
      ipcRenderer.on(IPC.mcpConfirm, listener)
      return () => {
        ipcRenderer.removeListener(IPC.mcpConfirm, listener)
      }
    }
  },
  capture: {
    page: (rect: CaptureRect) => ipcRenderer.invoke(IPC.capturePage, rect) as Promise<string>,
    save: (pngs: string[]) => ipcRenderer.invoke(IPC.captureSave, pngs) as Promise<string[]>,
    reveal: (file: string) => ipcRenderer.invoke(IPC.captureReveal, file) as Promise<void>,
    copy: (file: string) => ipcRenderer.invoke(IPC.captureCopy, file) as Promise<void>,
    read: (file: string) => ipcRenderer.invoke(IPC.captureRead, file) as Promise<string>,
    reply: (result: CaptureReply) => ipcRenderer.send(IPC.captureReply, result),
    onRun: (cb: (job: CaptureRun) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, job: CaptureRun) => cb(job)
      ipcRenderer.on(IPC.captureRun, listener)
      return () => {
        ipcRenderer.removeListener(IPC.captureRun, listener)
      }
    }
  },
  reverse: {
    start: (sessionId: string) => ipcRenderer.invoke(IPC.reverseStart, sessionId),
    stop: (sessionId: string) => ipcRenderer.invoke(IPC.reverseStop, sessionId),
    /** xterm 订阅完成后再放行缓存的远端输出 */
    bind: (termId: string) => ipcRenderer.send(IPC.reverseBind, termId),
    onState: (cb: (e: ReverseListenState) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, p: ReverseListenState) => cb(p)
      ipcRenderer.on(IPC.reverseState, listener)
      return () => {
        ipcRenderer.removeListener(IPC.reverseState, listener)
      }
    },
    onIncoming: (cb: (e: ReverseIncoming) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, p: ReverseIncoming) => cb(p)
      ipcRenderer.on(IPC.reverseIncoming, listener)
      return () => {
        ipcRenderer.removeListener(IPC.reverseIncoming, listener)
      }
    }
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion) as Promise<string>,
    checkUpdate: () => ipcRenderer.invoke(IPC.appCheckUpdate) as Promise<UpdateCheck>,
    openRelease: (url: string) => ipcRenderer.invoke(IPC.appOpenRelease, url) as Promise<void>
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
