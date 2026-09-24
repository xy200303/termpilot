import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAppStore } from '../stores/useAppStore'
import { parseSshCommand } from '../../../shared/parse-ssh'
import type { AuthType, ConnectMode, SessionInput } from '../../../shared/types'

const empty = (mode: ConnectMode): SessionInput => ({
  name: '',
  group: '',
  mode,
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  keyPath: '',
  listenPort: 4444,
  remark: '',
  secret: ''
})

/** 新建 / 编辑连接。表单控件全部来自 shadcn。 */
export function SessionForm() {
  const editing = useAppStore((s) => s.editing)
  const setEditing = useAppStore((s) => s.setEditing)
  const saveSession = useAppStore((s) => s.saveSession)

  const creating = editing?.action === 'create'
  const session = editing?.action === 'edit' ? editing.session : null
  const mode: ConnectMode = session?.mode ?? (creating ? editing.mode : 'forward')
  const lockedHost = creating && editing.host ? editing.host : ''

  const [form, setForm] = useState<SessionInput>(empty('forward'))
  const [command, setCommand] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    if (editing.action === 'edit') {
      const s = editing.session
      setForm({
        name: s.name,
        group: s.group,
        mode: s.mode ?? 'forward',
        host: s.host,
        port: s.port,
        username: s.username,
        authType: s.authType,
        keyPath: s.keyPath ?? '',
        listenPort: s.listenPort ?? 4444,
        remark: s.remark ?? '',
        secret: ''
      })
    } else {
      setForm({
        ...empty(editing.mode),
        host: editing.host ?? '',
        port: editing.port ?? 22
      })
    }
    setCommand('')
    setError('')
  }, [editing])

  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const applyCommand = (text: string) => {
    const parsed = parseSshCommand(text)
    if (!parsed) {
      setError('认不出这条 SSH 命令')
      return
    }
    setError('')
    setForm((current) => ({
      ...current,
      host: lockedHost || parsed.host,
      port: parsed.port,
      username: parsed.username || current.username,
      name: current.name.trim() ? current.name : parsed.name,
      authType: parsed.keyPath ? 'key' : current.authType,
      keyPath: parsed.keyPath ?? current.keyPath,
      secret: parsed.secret ?? current.secret
    }))
  }

  const submit = async () => {
    let next = lockedHost ? { ...form, host: lockedHost } : form
    if (mode === 'forward' && command.trim() && (!form.host.trim() || !form.username.trim())) {
      const parsed = parseSshCommand(command)
      if (!parsed) {
        setError('认不出这条 SSH 命令')
        return
      }
      next = {
        ...form,
        host: lockedHost || parsed.host,
        port: parsed.port,
        username: parsed.username || form.username,
        name: form.name.trim() ? form.name : parsed.name,
        authType: parsed.keyPath ? 'key' : form.authType,
        keyPath: parsed.keyPath ?? form.keyPath,
        secret: parsed.secret ?? form.secret
      }
      setForm(next)
    }
    if (!next.name.trim()) {
      setError('名称不能为空')
      return
    }
    if (mode === 'forward') {
      if (!next.host.trim() || !next.username.trim()) {
        setError('主机和用户名不能为空')
        return
      }
      if (creating && next.authType === 'password' && !next.secret) {
        setError('密码认证需要填写密码')
        return
      }
    } else if (!next.listenPort || next.listenPort < 1 || next.listenPort > 65535) {
      setError('监听端口需要在 1–65535')
      return
    }
    try {
      await saveSession(creating ? null : session!.id, {
        ...next,
        group: '',
        mode,
        secret: next.secret ? next.secret : undefined
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lockedHost ? `在 ${lockedHost} 上新建连接` : creating ? '新建' : '编辑'}
            {!lockedHost && (mode === 'forward' ? '正向 SSH' : '反向监听')}
          </DialogTitle>
          <DialogDescription>
            {lockedHost
              ? '主机已经确定，只要填写这条连接的账号。'
              : mode === 'forward'
                ? '本机作为客户端，主动 SSH 到有地址的服务器。'
                : '本机只在 127.0.0.1 上等待 shell 连入。公网地址用 cpolar 把这个端口映射出去。'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {mode === 'forward' && !lockedHost && (
            <Field label="粘贴命令">
              <Input
                value={command}
                placeholder="ssh user@host -p 22 -i ~/.ssh/id_ed25519"
                onChange={(e) => setCommand(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text')
                  if (!text.trim()) return
                  e.preventDefault()
                  setCommand(text.trim())
                  applyCommand(text)
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  applyCommand(command)
                }}
                onBlur={() => {
                  if (command.trim()) applyCommand(command)
                }}
              />
            </Field>
          )}
          <Field label="名称">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>

          {mode === 'forward' ? (
            <>
              <div className={lockedHost ? '' : 'grid grid-cols-[1fr_6rem] gap-2'}>
                {!lockedHost && (
                  <Field label="主机">
                    <Input
                      value={form.host}
                      placeholder="IP 或域名"
                      onChange={(e) => set('host', e.target.value)}
                    />
                  </Field>
                )}
                <Field label="端口">
                  <Input
                    type="number"
                    value={form.port}
                    onChange={(e) => set('port', Number(e.target.value) || 22)}
                  />
                </Field>
              </div>
              <Field label="用户名">
                <Input value={form.username} onChange={(e) => set('username', e.target.value)} />
              </Field>
              <Field label="认证">
                <Select
                  value={form.authType}
                  onValueChange={(v) => set('authType', v as AuthType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">密码</SelectItem>
                    <SelectItem value="key">私钥</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.authType === 'key' && (
                <Field label="私钥">
                  <Input
                    value={form.keyPath}
                    placeholder="C:\Users\...\.ssh\id_ed25519"
                    onChange={(e) => set('keyPath', e.target.value)}
                  />
                </Field>
              )}
              <Field label={form.authType === 'key' ? '私钥口令' : '密码'}>
                <Input
                  type="password"
                  value={form.secret}
                  placeholder={
                    form.authType === 'key'
                      ? creating
                        ? '私钥没有口令就留空'
                        : '留空则不修改'
                      : creating
                        ? ''
                        : '留空则不修改'
                  }
                  onChange={(e) => set('secret', e.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="本机端口">
                <Input
                  type="number"
                  value={form.listenPort}
                  onChange={(e) => set('listenPort', Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="公网备注">
                <Input
                  value={form.remark}
                  placeholder="例如 1.tcp.cpolar.cn:12345，仅自己看"
                  onChange={(e) => set('remark', e.target.value)}
                />
              </Field>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)}>
            取消
          </Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <Label className="grid gap-1 text-xs text-muted-foreground">
      {props.label}
      {props.children}
    </Label>
  )
}
