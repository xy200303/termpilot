import { useState } from 'react'
import { MonitorUp, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '../stores/useAppStore'
import { useT } from '../i18n'
import type { SessionConfig } from '../../../shared/types'

/** 原生 RDP 的画面由外部客户端显示，这里只管理进程与连接状态。 */
export function ExternalDesktopView(props: { viewId: string; session: SessionConfig }) {
  const t = useT()
  const status = useAppStore((s) => s.desktopState[props.viewId])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const open = async () => {
    setBusy(true)
    try {
      const result = await window.api.desktop.open(props.viewId, props.session.id)
      if (result.mode === 'external') setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-background p-8">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <MonitorUp className="size-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">RDP 独立窗口</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            画面由 FreeRDP 原生窗口显示，动态分辨率和剪贴板已启用。密码在原生窗口中输入，不写进命令行。
          </p>
        </div>
        {status?.status === 'connecting' && <p className="text-sm text-muted-foreground">正在启动客户端…</p>}
        {(status?.error || message) && (
          <pre className="max-h-48 w-full overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {status?.error || message}
          </pre>
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void open()}>
          <RotateCw />
          {busy ? t('正在打开…') : status?.status === 'connected' ? t('重新打开原生窗口') : t('打开原生窗口')}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          关闭这个标签会结束对应的原生客户端进程。画面不进入 Electron，因此整窗截图和录屏不包含原生窗口内容。
        </p>
      </div>
    </div>
  )
}
