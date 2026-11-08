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
        <Field label={t('desktop.host')}>
          <Input value={form.host} placeholder={t('desktop.ip_or_hostname')} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label={t('desktop.port')}>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => set('port', Number(e.target.value) || form.port)}
          />
        </Field>
      </div>
      <Field label={protocol === 'rdp' ? t('desktop.username') : t('desktop.vnc_password')}>
        <Input
          type={protocol === 'rdp' ? 'text' : 'password'}
          value={protocol === 'rdp' ? form.username : (form.secret ?? '')}
          placeholder={protocol === 'rdp' ? t('desktop.account_name_freerdp_asks_for_the_password') : t('desktop.leave_empty_if_there_is_no_password')}
          onChange={(e) => set(protocol === 'rdp' ? 'username' : 'secret', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('desktop.desktop_width_optional')}>
          <Input
            type="number"
            value={options.width ?? ''}
            placeholder={t('desktop.follow_window')}
            onChange={(e) => setOptions({ width: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field label={t('desktop.desktop_height_optional')}>
          <Input
            type="number"
            value={options.height ?? ''}
            placeholder={t('desktop.follow_window')}
            onChange={(e) => setOptions({ height: Number(e.target.value) || undefined })}
          />
        </Field>
      </div>
      <Field label={t('desktop.performance_mode')}>
        <Select
          value={options.performance ?? 'balanced'}
          onValueChange={(value) => setOptions({ performance: value as DesktopOptions['performance'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="quality">{t('desktop.quality')}</SelectItem>
            <SelectItem value="balanced">{t('desktop.balanced')}</SelectItem>
            <SelectItem value="speed">{t('desktop.speed')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Label className="flex items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          checked={options.clipboard !== false}
          onChange={(e) => setOptions({ clipboard: e.target.checked })}
        />
        {t('desktop.share_text_clipboard_with_this_machine')}
      </Label>
      {protocol === 'vnc' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.viewOnly === true}
            onChange={(e) => setOptions({ viewOnly: e.target.checked })}
          />
          {t('desktop.view_only_do_not_send_mouse_or_keyboard')}
        </Label>
      )}
      {protocol === 'rdp' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.nativeClient === true}
            onChange={(e) => setOptions({ nativeClient: e.target.checked })}
          />
          {t('desktop.use_the_freerdp_native_window_embedded_ironrdp_b')}
        </Label>
      )}
    </>
  )
}
