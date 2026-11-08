import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '../stores/useAppStore'
import i18n, { useT } from '../i18n'
import { parseSshCommand } from '../../../shared/parse-ssh'
import { sshOptionsForSession, sanitizeSshOptions, type SshConnectOptions } from '../../../shared/ssh-options'
import { SERIAL_DEFAULTS, TELNET_DEFAULT_PORT, defaultPort, isDesktopProtocol, protocolLabel, type SessionProtocol } from '../../../shared/protocol'
import type { AuthType, ConnectMode, SessionInput, SshConfigHost, SerialPortInfo } from '../../../shared/types'
import { DesktopFields } from './DesktopFields'

/** 名字里 @ 后面的地址。空格或路径不当成主机。 */
function addressInName(name: string): string | null {
  const at = name.lastIndexOf('@')
  if (at <= 0) return null
  const host = name.slice(at + 1).trim()
  if (!host || /[\s/\\]/.test(host)) return null
  return host
}

/**
 * 侧边栏按主机地址分组。
 * 这类连接的名字是「用户名@地址」。只改名字里的地址、主机框还是旧的，分组会留在旧机器下。
 * 反过来只改主机框、名字还挂着旧地址，看起来也像没挪走。保存时让两边一致。
 */
function reconcileEditedAddress(
  previous: { name: string; host: string },
  next: { name: string; host: string }
): { name: string; host: string } {
  const previousHost = previous.host.trim()
  const previousName = previous.name.trim()
  let name = next.name.trim()
  let host = next.host.trim()
  const named = addressInName(name)
  const previousNamed = addressInName(previousName)
  if (host === previousHost && name !== previousName && named && previousNamed === previousHost && named !== host) {
    host = named
  }
  if (previousHost && host !== previousHost && name.endsWith(`@${previousHost}`)) {
    name = `${name.slice(0, -previousHost.length)}${host}`
  }
  return { name, host }
}

/** 「手动输入」在串口下拉里的哨兵值，不能和真实设备路径冲突。 */
const MANUAL_SERIAL = '__manual__'

const empty = (mode: ConnectMode, protocol: SessionProtocol = 'ssh'): SessionInput => ({
  name: '',
  group: '',
  protocol,
  mode,
  host: '',
  port: defaultPort(protocol),
  username: '',
  authType: 'password',
  keyPath: '',
  serialPath: '',
  baudRate: SERIAL_DEFAULTS.baudRate,
  dataBits: SERIAL_DEFAULTS.dataBits,
  stopBits: SERIAL_DEFAULTS.stopBits,
  parity: SERIAL_DEFAULTS.parity,
  listenPort: 4444,
  remark: '',
  secret: '',
  jumpHost: '',
  jumpPort: 22,
  jumpUsername: '',
  jumpSecret: '',
  sftpMode: 'auto'
})

/** 新建 / 编辑连接。表单控件全部来自 shadcn。 */
export function SessionForm() {
  const editing = useAppStore((s) => s.editing)
  const setEditing = useAppStore((s) => s.setEditing)
  const saveSession = useAppStore((s) => s.saveSession)

  const t = useT()
  const creating = editing?.action === 'create'
  const session = editing?.action === 'edit' ? editing.session : null
  const mode: ConnectMode = session?.mode ?? (creating ? editing.mode : 'forward')
  const lockedHost = creating && editing.host ? editing.host : ''

  const [form, setForm] = useState<SessionInput>(empty('forward'))
  const [command, setCommand] = useState('')
  const [configHosts, setConfigHosts] = useState<SshConfigHost[]>([])
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[] | null>(null)
  const [manualPath, setManualPath] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState('connect')

  useEffect(() => {
    if (!editing) return
    if (editing.action === 'edit') {
      const s = editing.session
      setForm({
        name: s.name,
        group: s.group,
        protocol: s.protocol ?? 'ssh',
        mode: s.mode ?? 'forward',
        host: s.host,
        port: s.port,
        username: s.username,
        authType: s.authType,
        keyPath: s.keyPath ?? '',
        serialPath: s.serialPath ?? '',
        baudRate: s.baudRate ?? SERIAL_DEFAULTS.baudRate,
        dataBits: s.dataBits ?? SERIAL_DEFAULTS.dataBits,
        stopBits: s.stopBits ?? SERIAL_DEFAULTS.stopBits,
        parity: s.parity ?? SERIAL_DEFAULTS.parity,
        listenPort: s.listenPort ?? 4444,
        remark: s.remark ?? '',
        secret: '',
        jumpHost: s.jumpHost ?? '',
        jumpPort: s.jumpPort ?? 22,
        jumpUsername: s.jumpUsername ?? '',
        jumpSecret: '',
        sshOptions: s.sshOptions,
        sftpMode: s.sftpMode ?? 'auto',
        desktopOptions: s.desktopOptions
      })
    } else {
      setForm({
        ...empty(editing.mode, editing.protocol ?? 'ssh'),
        host: editing.host ?? '',
        port: editing.port ?? defaultPort(editing.protocol ?? 'ssh')
      })
    }
    setCommand('')
    setError('')
    setPage('connect')
    setManualPath(false)
    setSerialPorts(null)
    void window.api.serial
      .list()
      .then((ports) => {
        setSerialPorts(ports)
        if (ports.length === 0) setManualPath(true)
      })
      .catch(() => {
        setSerialPorts([])
        setManualPath(true)
      })
    if (editing.action === 'create') {
      void window.api.sessions.sshConfigHosts().then(setConfigHosts)
    } else {
      setConfigHosts([])
    }
  }, [editing])

  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const scanSerial = () => {
    setSerialPorts(null)
    void window.api.serial
      .list()
      .then(setSerialPorts)
      .catch(() => setSerialPorts([]))
  }

  const protocol: SessionProtocol = form.protocol ?? 'ssh'

  const switchProtocol = (next: SessionProtocol) => {
    setError('')
    setForm((f) => ({
      ...f,
      protocol: next,
      port: defaultPort(next)
    }))
  }

  const setOption = <K extends keyof SshConnectOptions>(key: K, value: SshConnectOptions[K] | undefined) => {
    setForm((current) => {
      const options: SshConnectOptions = { ...(current.sshOptions ?? {}) }
      if (value === undefined) delete options[key]
      else options[key] = value
      return { ...current, sshOptions: options }
    })
  }

  const reject = (message: string, tab: string) => {
    setError(message)
    setPage(tab)
  }

  const applyCommand = (text: string) => {
    const parsed = parseSshCommand(text)
    if (!parsed) {
      setError(t('form.could_not_parse_this_ssh_command'))
      return
    }
    setError('')
    setForm((current) => ({
      ...current,
      host: lockedHost || parsed.host,
      port: parsed.port,
      username: parsed.username || current.username,
      name: current.name.trim() ? current.name : parsed.name,
      authType: parsed.authType ?? current.authType,
      keyPath: parsed.keyPath ?? current.keyPath,
      secret: parsed.secret ?? current.secret,
      jumpHost: parsed.jump?.host ?? '',
      jumpPort: parsed.jump?.port ?? 22,
      jumpUsername: parsed.jump?.username ?? '',
      jumpSecret: parsed.jump?.secret ?? '',
      sshOptions: parsed.options ?? null
    }))
  }

  const applyImport = (alias: string) => {
    const host = configHosts.find((item) => item.alias === alias)
    if (!host) return
    const [keyPath, ...restKeys] = host.identityFiles
    const [jump, ...extraJumps] = host.jumps
    setError('')
    setForm((current) => ({
      ...current,
      name: current.name.trim() ? current.name : host.alias,
      host: host.hostName,
      port: host.port,
      username: host.username || current.username,
      authType: keyPath ? 'key' : current.authType,
      keyPath: keyPath ?? current.keyPath,
      jumpHost: jump?.host ?? '',
      jumpPort: jump?.port ?? 22,
      jumpUsername: jump?.username ?? '',
      sshOptions:
        sanitizeSshOptions({
          ...(restKeys.length > 0 ? { keyPaths: restKeys } : {}),
          ...(extraJumps.length > 0 ? { extraJumps } : {}),
          ...(host.proxyCommand ? { proxyCommand: host.proxyCommand } : {})
        }) ?? null
    }))
  }

  const submit = async () => {
    let next = lockedHost ? { ...form, host: lockedHost } : form
    if (mode === 'forward' && protocol === 'ssh' && command.trim() && (!form.host.trim() || !form.username.trim())) {
      const parsed = parseSshCommand(command)
      if (!parsed) {
        setError(t('form.could_not_parse_this_ssh_command'))
        return
      }
      next = {
        ...form,
        host: lockedHost || parsed.host,
        port: parsed.port,
        username: parsed.username || form.username,
        name: form.name.trim() ? form.name : parsed.name,
        authType: parsed.authType ?? form.authType,
        keyPath: parsed.keyPath ?? form.keyPath,
        secret: parsed.secret ?? form.secret,
        jumpHost: parsed.jump?.host ?? '',
        jumpPort: parsed.jump?.port ?? 22,
        jumpUsername: parsed.jump?.username ?? '',
        jumpSecret: parsed.jump?.secret ?? '',
        sshOptions: parsed.options ?? null
      }
      setForm(next)
    }
    if (session && mode === 'forward' && protocol === 'ssh') {
      const synced = reconcileEditedAddress(session, { name: next.name, host: next.host })
      next = { ...next, name: synced.name, host: synced.host }
    }
    if (!next.name.trim()) {
      reject(t('form.name_is_required'), 'connect')
      return
    }
    if (mode === 'forward') {
      if (protocol === 'serial') {
        if (!next.serialPath?.trim()) {
          reject(t('form.serial_path_is_required_e_g_com3_or_dev_ttyusb0'), 'connect')
          return
        }
      } else {
        if (!next.host.trim()) {
          reject(t('form.host_is_required'), 'connect')
          return
        }
        if (protocol === 'ssh') {
          if (!next.username.trim()) {
            reject(t('form.username_is_required'), 'auth')
            return
          }
          if (creating && next.authType === 'password' && !next.secret) {
            reject(t('form.password_is_required_for_password_authentication'), 'auth')
            return
          }
          if (next.jumpHost?.trim() && !next.jumpUsername?.trim()) {
            reject(t('form.jump_host_username_is_required'), 'jump')
            return
          }
        }
      }
    } else if (!next.listenPort || next.listenPort < 1 || next.listenPort > 65535) {
      setError(t('form.listen_port_must_be_between_1_and_65535'))
      return
    }
    try {
      await saveSession(creating ? null : session!.id, {
        ...next,
        protocol,
        serialPath: next.serialPath?.trim() ?? '',
        remark: next.remark?.trim() ?? '',
        group: '',
        mode,
        secret: next.secret ? next.secret : undefined,
        jumpHost: protocol === 'ssh' ? (next.jumpHost?.trim() ?? '') : '',
        jumpPort: next.jumpPort ?? 22,
        jumpUsername: protocol === 'ssh' ? (next.jumpUsername?.trim() ?? '') : '',
        jumpSecret: protocol === 'ssh' && next.jumpHost?.trim() ? (next.jumpSecret ? next.jumpSecret : undefined) : '',
        sshOptions: sshOptionsForSession(next.jumpHost, next.sshOptions) ?? null,
        desktopOptions: isDesktopProtocol(protocol) ? next.desktopOptions : null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const options = form.sshOptions ?? undefined
  const hostKey = options?.strictHostKeyChecking === 'no' || options?.strictHostKeyChecking === 'accept-new' ? 'skip' : 'default'
  const family = options?.family === 4 ? '4' : options?.family === 6 ? '6' : 'any'
  const recognized = recognizedNote(options)

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {lockedHost ? t('form.new_connection_on_host', { host: lockedHost }) : creating ? t('form.new') : t('form.edit')}
            {!lockedHost && (mode === 'forward' ? (protocol === 'ssh' ? t('form.ssh') : t(protocolLabel(protocol))) : t('form.reverse_listener'))}
          </DialogTitle>
          <DialogDescription>
            {lockedHost
              ? t('form.host_is_fixed_just_fill_in_the_account_for_this_')
              : mode === 'forward'
                ? protocol === 'ssh'
                  ? t('form.this_machine_connects_out_to_a_reachable_ssh_ser')
                  : protocol === 'telnet'
                    ? t('form.telnet_is_plaintext_use_it_only_on_trusted_netwo')
                    : protocol === 'serial'
                      ? t('form.connect_to_a_local_serial_device_byte_stream_onl')
                      : protocol === 'rdp'
                        ? t('form.uses_embedded_ironrdp_by_default_freerdp_native_')
                        : t('form.uses_embedded_novnc_the_desktop_is_shown_in_the_')
                : t('form.listens_on_127_0_0_1_for_an_incoming_shell_expos')}
          </DialogDescription>
        </DialogHeader>

        {mode === 'forward' ? (
          <>
            {!lockedHost && (
              <Field label={t('form.protocol')}>
                <Select value={protocol} onValueChange={(v) => switchProtocol(v as SessionProtocol)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssh">SSH</SelectItem>
                    <SelectItem value="telnet">Telnet</SelectItem>
                    <SelectItem value="serial">{t('form.serial')}</SelectItem>
                    <SelectItem value="rdp">RDP</SelectItem>
                    <SelectItem value="vnc">VNC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            {protocol !== 'ssh' ? (
              <div className="grid min-h-52 content-start gap-3">
                <Field label={t('form.name')}>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label={t('form.note')}>
                  <Input
                    value={form.remark ?? ''}
                    placeholder={t('form.what_this_connection_is_for_only_you_see_it')}
                    onChange={(e) => set('remark', e.target.value)}
                  />
                </Field>
                {isDesktopProtocol(protocol) ? (
                  <DesktopFields protocol={protocol} form={form} set={set} />
                ) : protocol === 'telnet' ? (
                  <div className="grid grid-cols-[1fr_6rem] gap-2">
                    <Field label={t('desktop.host')}>
                      <Input
                        value={form.host}
                        placeholder={t('desktop.ip_or_hostname')}
                        onChange={(e) => set('host', e.target.value)}
                      />
                    </Field>
                    <Field label={t('desktop.port')}>
                      <Input
                        type="number"
                        value={form.port}
                        onChange={(e) => set('port', Number(e.target.value) || TELNET_DEFAULT_PORT)}
                      />
                    </Field>
                  </div>
                ) : (
                  <>
                    <Field label={t('form.serial_path')}>
                      {manualPath ? (
                        <div className="flex gap-2">
                          <Input
                            value={form.serialPath ?? ''}
                            placeholder={t('form.com3_or_dev_ttyusb0')}
                            onChange={(e) => set('serialPath', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={t('form.rescan_and_pick_a_serial_port')}
                            onClick={() => {
                              scanSerial()
                              setManualPath(false)
                            }}
                          >
                            <RefreshCw />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select
                            value={form.serialPath || undefined}
                            onValueChange={(value) =>
                              value === MANUAL_SERIAL ? setManualPath(true) : set('serialPath', value)
                            }
                          >
                            <SelectTrigger className="min-w-0 flex-1">
                              <SelectValue
                                placeholder={
                                  serialPorts === null
                                    ? t('form.scanning_serial_ports')
                                    : serialPorts.length
                                      ? t('form.select_a_serial_port')
                                      : t('form.no_serial_port_found')
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(serialPorts ?? []).map((port) => (
                                <SelectItem key={port.path} value={port.path}>
                                  {port.path}
                                  {port.friendlyName || port.manufacturer
                                    ? ` · ${port.friendlyName ?? port.manufacturer}`
                                    : ''}
                                </SelectItem>
                              ))}
                              {form.serialPath &&
                                !(serialPorts ?? []).some((port) => port.path === form.serialPath) && (
                                  <SelectItem value={form.serialPath}>
                                    {form.serialPath}{t('form.not_detected_now')}
                                  </SelectItem>
                                )}
                              <SelectItem value={MANUAL_SERIAL}>{t('form.enter_manually')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={t('form.rescan_serial_ports')}
                            onClick={scanSerial}
                          >
                            <RefreshCw />
                          </Button>
                        </div>
                      )}
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={t('form.baud_rate')}>
                        <Input
                          type="number"
                          value={form.baudRate ?? SERIAL_DEFAULTS.baudRate}
                          onChange={(e) => set('baudRate', Number(e.target.value) || SERIAL_DEFAULTS.baudRate)}
                        />
                      </Field>
                      <Field label={t('form.data_bits')}>
                        <Select
                          value={String(form.dataBits ?? SERIAL_DEFAULTS.dataBits)}
                          onValueChange={(v) => set('dataBits', Number(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[8, 7, 6, 5].map((bits) => (
                              <SelectItem key={bits} value={String(bits)}>
                                {bits}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t('form.stop_bits')}>
                        <Select
                          value={String(form.stopBits ?? SERIAL_DEFAULTS.stopBits)}
                          onValueChange={(v) => set('stopBits', Number(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t('form.parity')}>
                        <Select
                          value={form.parity ?? SERIAL_DEFAULTS.parity}
                          onValueChange={(v) => set('parity', v as SessionInput['parity'])}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('form.none')}</SelectItem>
                            <SelectItem value="even">{t('form.even')}</SelectItem>
                            <SelectItem value="odd">{t('form.odd')}</SelectItem>
                            <SelectItem value="mark">Mark</SelectItem>
                            <SelectItem value="space">Space</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </>
                )}
              </div>
            ) : (
          <Tabs value={page} onValueChange={setPage}>
            <TabsList className="w-full">
              <TabsTrigger value="connect">{t('form.connections')}</TabsTrigger>
              <TabsTrigger value="auth">{t('form.authentication')}</TabsTrigger>
              <TabsTrigger value="jump">{t('form.jump_host')}</TabsTrigger>
              <TabsTrigger value="advanced">{t('form.advanced')}</TabsTrigger>
            </TabsList>
            <TabsContent value="connect" className="grid min-h-52 gap-3">
              {creating && configHosts.length > 0 && (
                <Field label={t('form.import_from_ssh_config')}>
                  <Select value="" onValueChange={applyImport}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('form.pick_a_host_from_ssh_config_to_fill_the_form')} />
                    </SelectTrigger>
                    <SelectContent>
                      {configHosts.map((host) => (
                        <SelectItem key={host.alias} value={host.alias}>
                          {host.alias}（{host.username ? `${host.username}@` : ''}{host.hostName}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {!lockedHost && (
                <Field label={t('form.paste_command')}>
                  <Input
                    value={command}
                    placeholder="ssh -J user@jump:22 user@host -p 22"
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
              <Field label={t('form.name')}>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label={t('form.note')}>
                <Input
                  value={form.remark ?? ''}
                  placeholder={t('form.what_this_connection_is_for_only_you_see_it')}
                  onChange={(e) => set('remark', e.target.value)}
                />
              </Field>
              <div className={lockedHost ? '' : 'grid grid-cols-[1fr_6rem] gap-2'}>
                {!lockedHost && (
                  <Field label={t('desktop.host')}>
                    <Input
                      value={form.host}
                      placeholder={t('desktop.ip_or_hostname')}
                      onChange={(e) => set('host', e.target.value)}
                    />
                  </Field>
                )}
                <Field label={t('desktop.port')}>
                  <Input
                    type="number"
                    value={form.port}
                    onChange={(e) => set('port', Number(e.target.value) || 22)}
                  />
                </Field>
              </div>
            </TabsContent>
            <TabsContent value="auth" className="grid min-h-52 gap-3">
              <Field label={t('desktop.username')}>
                <Input value={form.username} onChange={(e) => set('username', e.target.value)} />
              </Field>
              <Field label={t('form.authentication')}>
                <Select value={form.authType} onValueChange={(v) => set('authType', v as AuthType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">{t('form.password')}</SelectItem>
                    <SelectItem value="key">{t('form.private_key')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.authType === 'key' && (
                <Field label={t('form.private_key')}>
                  <div className="flex gap-2">
                    <Input
                      value={form.keyPath}
                      placeholder="C:\Users\...\.ssh\id_ed25519"
                      onChange={(e) => set('keyPath', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        void window.api.app.pickKeyFile().then((file) => {
                          if (file) set('keyPath', file)
                        })
                      }}
                    >
                      {t('form.browse')}
                    </Button>
                  </div>
                </Field>
              )}
              <Field label={form.authType === 'key' ? t('form.key_passphrase') : t('form.password')}>
                <Input
                  type="password"
                  value={form.secret}
                  placeholder={
                    form.authType === 'key'
                      ? creating
                        ? t('form.leave_empty_if_the_key_has_no_passphrase')
                        : t('form.leave_empty_to_keep_current')
                      : creating
                        ? ''
                        : t('form.leave_empty_to_keep_current')
                  }
                  onChange={(e) => set('secret', e.target.value)}
                />
              </Field>
            </TabsContent>
            <TabsContent value="jump" className="grid min-h-52 gap-3">
              <p className="text-xs text-muted-foreground">
                {t('form.same_as_ssh_j_keep_everything_after_the_colon_in')}
              </p>
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <Field label={t('form.jump_host')}>
                  <Input
                    value={form.jumpHost ?? ''}
                    placeholder={t('desktop.ip_or_hostname')}
                    onChange={(e) => set('jumpHost', e.target.value)}
                  />
                </Field>
                <Field label={t('desktop.port')}>
                  <Input
                    type="number"
                    value={form.jumpPort ?? 22}
                    onChange={(e) => set('jumpPort', Number(e.target.value) || 22)}
                  />
                </Field>
              </div>
              <Field label={t('form.jump_username')}>
                <Input value={form.jumpUsername ?? ''} onChange={(e) => set('jumpUsername', e.target.value)} />
              </Field>
              <Field label={t('form.jump_password')}>
                <Input
                  type="password"
                  value={form.jumpSecret ?? ''}
                  placeholder={creating ? t('form.fill_only_if_the_jump_host_needs_a_password') : session?.hasJumpSecret ? t('form.leave_empty_to_keep_current') : ''}
                  onChange={(e) => set('jumpSecret', e.target.value)}
                />
              </Field>
              {options?.extraJumps?.length ? (
                <p className="text-xs text-muted-foreground">
                  {t('form.extra_jumps', { list: options.extraJumps.map((hop) => `${hop.username}@${hop.host}:${hop.port}`).join(', ') })}
                </p>
              ) : null}
            </TabsContent>
            <TabsContent value="advanced" className="grid min-h-52 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('form.connect_timeout_s')}>
                  <Input
                    type="number"
                    value={secondsOf(options?.readyTimeoutMs)}
                    placeholder={t('form.default_15')}
                    onChange={(e) => setOption('readyTimeoutMs', secondsToMs(e.target.value))}
                  />
                </Field>
                <Field label={t('form.keepalive_interval_s')}>
                  <Input
                    type="number"
                    value={secondsOf(options?.keepaliveIntervalMs)}
                    placeholder={t('form.default_15_0_disables')}
                    onChange={(e) => setOption('keepaliveIntervalMs', secondsToMs(e.target.value))}
                  />
                </Field>
              </div>
              <Field label={t('form.host_key')}>
                <Select
                  value={hostKey}
                  onValueChange={(v) => setOption('strictHostKeyChecking', v === 'skip' ? 'no' : undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('form.verify_with_defaults')}</SelectItem>
                    <SelectItem value="skip">{t('form.do_not_verify')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('form.address_family')}>
                  <Select
                    value={family}
                    onValueChange={(v) => setOption('family', v === '4' ? 4 : v === '6' ? 6 : undefined)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('form.auto')}</SelectItem>
                      <SelectItem value="4">{t('form.ipv4_only')}</SelectItem>
                      <SelectItem value="6">{t('form.ipv6_only')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('form.compression')}>
                  <Select
                    value={options?.compress ? 'on' : 'off'}
                    onValueChange={(v) => setOption('compress', v === 'on' ? true : undefined)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">{t('editor.close')}</SelectItem>
                      <SelectItem value="on">{t('form.open')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t('form.file_channel')}>
                <Select
                  value={form.sftpMode ?? 'auto'}
                  onValueChange={(v) => set('sftpMode', v as SessionInput['sftpMode'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('form.auto_dial_separately_when_sftp_is_missing')}</SelectItem>
                    <SelectItem value="shared">{t('form.reuse_terminal_connection')}</SelectItem>
                    <SelectItem value="fresh">{t('form.always_dial_separately')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('form.for_jump_hosts_that_authorize_a_single_forwardin')}
                </p>
              </Field>
              <Field label="ProxyCommand">
                <Input
                  value={options?.proxyCommand ?? ''}
                  placeholder={t('form.local_command_used_instead_of_a_direct_connectio')}
                  onChange={(e) => setOption('proxyCommand', e.target.value.trim() ? e.target.value : undefined)}
                />
              </Field>
              {recognized ? <p className="text-xs text-muted-foreground">{recognized}</p> : null}
            </TabsContent>
          </Tabs>
            )}
          </>
        ) : (
          <div className="grid gap-3">
            <Field label={t('form.name')}>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label={t('form.local_port')}>
              <Input
                type="number"
                value={form.listenPort}
                onChange={(e) => set('listenPort', Number(e.target.value) || 0)}
              />
            </Field>
            <Field label={t('form.note')}>
              <Input
                value={form.remark}
                placeholder={t('form.what_this_connection_is_for_or_its_public_addres')}
                onChange={(e) => set('remark', e.target.value)}
              />
            </Field>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)}>
            {t('editor.cancel')}
          </Button>
          <Button onClick={submit}>{t('editor.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function secondsOf(ms: number | undefined): string {
  return ms === undefined ? '' : String(Math.round(ms / 1000))
}

function secondsToMs(text: string): number | undefined {
  if (!text.trim()) return undefined
  const n = Number(text)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.min(Math.trunc(n) * 1000, 300_000)
}

function recognizedNote(options: SshConnectOptions | undefined): string {
  if (!options) return ''
  const tr = (key: string, params?: Record<string, string | number>): string =>
    String(i18n.t(key, { ...(params ?? {}), defaultValue: key }))
  const parts: string[] = []
  if (options.algorithms?.cipher) parts.push(tr('form.cipher'))
  if (options.algorithms?.kex) parts.push(tr('form.kex'))
  if (options.algorithms?.serverHostKey) parts.push(tr('form.host_key'))
  if (options.algorithms?.hmac) parts.push(tr('form.mac'))
  if (options.keyPaths?.length) parts.push(tr('form.extra_keys', { count: options.keyPaths.length }))
  return parts.length > 0 ? tr('form.ssh_options_summary', { parts: parts.join(', ') }) : ''
}

export function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <Label className="grid gap-1 text-xs text-muted-foreground">
      {props.label}
      {props.children}
    </Label>
  )
}
