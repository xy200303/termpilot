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
        <Field label={t('Host')}>
          <Input value={form.host} placeholder={t('IP or hostname')} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label={t('Port')}>
          <Input
            type="number"
            value={form.port}
            onChange={(e) => set('port', Number(e.target.value) || form.port)}
          />
        </Field>
      </div>
      <Field label={protocol === 'rdp' ? t('Username') : t('VNC password')}>
        <Input
          type={protocol === 'rdp' ? 'text' : 'password'}
          value={protocol === 'rdp' ? form.username : (form.secret ?? '')}
          placeholder={protocol === 'rdp' ? t('Account name; FreeRDP asks for the password') : t('Leave empty if there is no password')}
          onChange={(e) => set(protocol === 'rdp' ? 'username' : 'secret', e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('Desktop width (optional)')}>
          <Input
            type="number"
            value={options.width ?? ''}
            placeholder={t('Follow window')}
            onChange={(e) => setOptions({ width: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field label={t('Desktop height (optional)')}>
          <Input
            type="number"
            value={options.height ?? ''}
            placeholder={t('Follow window')}
            onChange={(e) => setOptions({ height: Number(e.target.value) || undefined })}
          />
        </Field>
      </div>
      <Field label={t('Performance mode')}>
        <Select
          value={options.performance ?? 'balanced'}
          onValueChange={(value) => setOptions({ performance: value as DesktopOptions['performance'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="quality">{t('Quality')}</SelectItem>
            <SelectItem value="balanced">{t('Balanced')}</SelectItem>
            <SelectItem value="speed">{t('Speed')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Label className="flex items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          checked={options.clipboard !== false}
          onChange={(e) => setOptions({ clipboard: e.target.checked })}
        />
        {t('Share text clipboard with this machine')}
      </Label>
      {protocol === 'vnc' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.viewOnly === true}
            onChange={(e) => setOptions({ viewOnly: e.target.checked })}
          />
          {t('View only, do not send mouse or keyboard')}
        </Label>
      )}
      {protocol === 'rdp' && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <input
            type="checkbox"
            checked={options.nativeClient === true}
            onChange={(e) => setOptions({ nativeClient: e.target.checked })}
          />
          {t('Use the FreeRDP native window (embedded IronRDP by default)')}
        </Label>
      )}
    </>
  )
}
