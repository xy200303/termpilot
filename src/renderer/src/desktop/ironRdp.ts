import '@devolutions/iron-remote-desktop'
import { Backend, displayControl, init as initBackend } from '@devolutions/iron-remote-desktop-rdp'
import type { NewSessionInfo, Session, UserInteraction } from '@devolutions/iron-remote-desktop'
import i18n from '../i18n'

const tr = (key: string, params?: Record<string, string | number>): string =>
  String(i18n.t(key, { ...(params ?? {}), defaultValue: key }))

const ELEMENT_TAG = 'iron-remote-desktop'
const READY_TIMEOUT_MS = 15_000
const CONNECT_TIMEOUT_MS = 30_000

type IronRdpElement = HTMLElement & {
  module?: unknown
  scale?: string
  verbose?: string
  flexcenter?: string
}

let backendReady: Promise<void> | null = null

/** 官方 wasm 只初始化一次：init 必须在 connect() 之前完成。 */
export function initIronRdp(): Promise<void> {
  backendReady ??= initBackend('WARN')
  return backendReady
}

export interface IronRdpOptions {
  url: string
  host: string
  port: number
  username: string
  password?: string
  width: number
  height: number
  container: HTMLElement
  clipboard?: boolean
}

export interface IronRdpConnection {
  element: IronRdpElement
  ui: UserInteraction
  sessionInfo: NewSessionInfo
  canvas: () => HTMLCanvasElement | null
  shutdown: () => void
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function waitForReady(element: IronRdpElement): Promise<UserInteraction> {
  if (!customElements.get(ELEMENT_TAG)) throw new Error(tr('rdp.rdp_component_not_registered'))
  return withTimeout(
    new Promise<UserInteraction>((resolve) => {
      element.addEventListener(
        'ready',
        (event) => {
          const detail = (event as CustomEvent<{ irgUserInteraction: UserInteraction }>).detail
          resolve(detail.irgUserInteraction)
        },
        { once: true }
      )
    }),
    READY_TIMEOUT_MS,
    tr('rdp.rdp_component_not_ready')
  )
}

export async function connectIronRdp(options: IronRdpOptions): Promise<IronRdpConnection> {
  await initIronRdp()

  const element = document.createElement(ELEMENT_TAG) as IronRdpElement
  element.setAttribute('verbose', 'false')
  element.setAttribute('scale', 'fit')
  element.setAttribute('flexcenter', 'true')
  element.style.display = 'block'
  element.style.width = '100%'
  element.style.height = '100%'

  const ready = waitForReady(element)
  element.module = Backend
  options.container.appendChild(element)

  let ui: UserInteraction
  try {
    ui = await ready
  } catch (error) {
    element.remove()
    throw error
  }

  const token = new URL(options.url).searchParams.get('token') ?? 'termpilot'
  const config = ui
    .configBuilder()
    .withUsername(options.username)
    .withPassword(options.password ?? '')
    .withDestination(`${options.host}:${options.port}`)
    .withProxyAddress(options.url)
    .withAuthToken(token)
    .withDesktopSize({ width: options.width, height: options.height })
    .withExtension(displayControl(true))
    .build()

  ui.setEnableClipboard(options.clipboard !== false)
  ui.setEnableAutoClipboard(options.clipboard !== false)

  let sessionInfo: NewSessionInfo
  try {
    sessionInfo = await withTimeout(ui.connect(config), CONNECT_TIMEOUT_MS, tr('rdp.rdp_connect_timeout'))
  } catch (error) {
    element.remove()
    throw error
  }

  ui.setKeyboardUnicodeMode(true)
  ui.setScale(1)
  ui.setVisibility(true)

  const canvas = (): HTMLCanvasElement | null => element.shadowRoot?.querySelector('canvas') ?? null
  return {
    element,
    ui,
    sessionInfo,
    canvas,
    shutdown: () => {
      try {
        ui.shutdown()
      } catch {
        // 已经断开时 shutdown 会抛，忽略
      }
      element.remove()
    }
  }
}

/** 组件把 session 收在自己内部，这里只能通过运行结果判断会话是否结束。 */
export function runIronRdp(connection: IronRdpConnection): Promise<{ reason: () => string }> {
  return connection.sessionInfo.run() as Promise<{ reason: () => string }>
}

export type { Session, UserInteraction, NewSessionInfo }
