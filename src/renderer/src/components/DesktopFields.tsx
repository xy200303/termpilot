import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DesktopOptions, SessionInput } from '../../../shared/types'
import type { DesktopProtocol } from '../../../shared/protocol'
import { Field } from './SessionForm'
import { useT } from '../i18n'

export function DesktopFields(props: {
  protocol: DesktopProtocol
  form: SessionInput
  set: <K extends keyof SessionInput>(key: K, value: SessionInput[K]) => void
}) {
  const t = useT()
  const { form, protocol, set } = props
  const options = form.desktopOptions ?? {}
  const setOptions = (patch: Partial<DesktopOptions>) =>
    set('desktopOptions', { ...options, ...patch })

  return (
    <>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Field label={t('主机')}>
          <Input value={form.host} placeholder={t('IP 或域名')} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label={t('端口')}>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => set('port', Number(e.target.value) || form.port)}
          />
        </Field>
      </div>
      <Field label={protocol === 'rdp' ? t('用户名') : t('VNC 密码')}>
        <Input
          type={protocol === 'rdp' ? 'text' : 'password'}
          value={protocol === 'rdp' ? form.username : (form.secret ?? '')}
          placeholder={protocol === 'rdp' ? t('登录账号，密码由 FreeRDP 窗口询问') : t('无密码可留空')}
          onChange={(e) => set(protocol === 'rdp' ? 'username' : 'secret', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('桌面宽度（可选）')}>
          <Input
            type="number"
            value={options.width ?? ''}
            placeholder={t('跟随窗口')}
            onChange={(e) => setOptions({ width: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field label={t('桌面高度（可选）')}>
          <Input
            type="number"
            value={options.height ?? ''}
            placeholder={t('跟随窗口')}
            onChange={(e) => setOptions({ height: Number(e.target.value) || undefined })}
          />
        </Field>
      </div>
      <Field label={t('性能模式')}>
        <Select
          value={options.performance ?? 'balanced'}
          onValueChange={(value) => setOptions({ performance: value as DesktopOptions['performance'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="quality">{t('画质优先')}</SelectItem>
            <SelectItem value="balanced">{t('平衡')}</SelectItem>
            <SelectItem value="speed">{t('流畅优先')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Label className="flex items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          checked={options.clipboard !== false}
          onChange={(e) => setOptions({ clipboard: e.target.checked })}
        />
        {t('与本机共享文本剪贴板')}
      </Label>
      {protocol === 'vnc' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.viewOnly === true}
            onChange={(e) => setOptions({ viewOnly: e.target.checked })}
          />
          {t('只观看，不发送鼠标键盘')}
        </Label>
      )}
      {protocol === 'rdp' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.nativeClient === true}
            onChange={(e) => setOptions({ nativeClient: e.target.checked })}
          />
          {t('改用 FreeRDP 原生窗口（默认内嵌 IronRDP）')}
        </Label>
      )}
    </>
  )
}
