import type { ExecService } from '../ExecService'
import { t as mt } from '../../i18n'
import type { StorageService } from '../StorageService'
import type { DesktopService } from './DesktopService'

export class LinuxAccessibilityService {
  constructor(
    private storage: StorageService,
    private exec: ExecService,
    private desktop: DesktopService
  ) {}

  async run(viewId: string, operation: 'tree' | 'click', path?: string, action?: string): Promise<string> {
    const session = this.desktop.sessionOf(viewId)
    if (!session) throw new Error(mt('a11y.desktop_missing'))
    if (session.protocol !== 'vnc') throw new Error(mt('a11y.vnc_only'))
    const host = session.host.trim().toLowerCase()
    const ssh = this.storage.list().find((item) =>
      item.protocol === 'ssh' && item.mode === 'forward' && item.host.trim().toLowerCase() === host
    )
    if (!ssh) {
      throw new Error(mt('a11y.no_ssh', { host: session.host }))
    }
    const display = Math.max(0, (session.port || 5900) - 5900)
    const payload = Buffer.from(JSON.stringify({ operation, path: path ?? '', action: action ?? '' }), 'utf8').toString('base64')
    const script = Buffer.from(PYTHON.replace('__PAYLOAD__', payload), 'utf8').toString('base64')
    const command = `DISPLAY=:${display} NO_AT_BRIDGE=0 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus python3 -c "import base64;exec(base64.b64decode('${script}'))"`
    const run = await this.exec.exec(ssh.id, { command, timeoutMs: 25_000, maxBytes: 80_000 })
    const text = `${run.stdout}\n${run.stderr}`.trim()
    if (run.exitCode !== 0) {
      if (/org\.a11y\.Bus|ServiceUnknown|at-spi|AT-SPI/i.test(text)) {
        throw new Error(mt('a11y.no_service', { text }))
      }
      throw new Error(mt('a11y.read_failed', { text }))
    }
    return text
  }
}

const PYTHON = String.raw`
import base64
import json
import sys
import dbus

REQ = json.loads(base64.b64decode('__PAYLOAD__').decode('utf-8'))
ACCESSIBLE = 'org.a11y.atspi.Accessible'
ACTION = 'org.a11y.atspi.Action'
COMPONENT = 'org.a11y.atspi.Component'
REGISTRY = 'org.a11y.atspi.Registry'
PROPERTIES = 'org.freedesktop.DBus.Properties'

try:
    session = dbus.SessionBus()
    launcher = session.get_object('org.a11y.Bus', '/org/a11y/bus')
    address = launcher.GetAddress(dbus_interface='org.a11y.Bus')
    bus = dbus.connection.Connection(address)
    registry = bus.get_object('org.a11y.atspi.Registry', '/org/a11y/atspi/registry')
    root_ref = registry.getDesktop(0, dbus_interface=REGISTRY)
except Exception as error:
    print(mt('a11y.bus_unavailable') + str(error), file=sys.stderr)
    sys.exit(2)

def proxy(reference):
    if isinstance(reference, (tuple, list, dbus.Struct)) and len(reference) >= 2:
        return bus.get_object(str(reference[0]), str(reference[1]))
    return bus.get_object('org.a11y.atspi.Registry', str(reference))

def prop(obj, name, interface=ACCESSIBLE):
    return obj.Get(interface, name, dbus_interface=PROPERTIES)

def name(obj):
    try:
        return str(prop(obj, 'Name'))
    except Exception:
        return ''

def role(obj):
    try:
        return str(obj.GetRoleName(dbus_interface=ACCESSIBLE))
    except Exception:
        try:
            return str(prop(obj, 'Role'))
        except Exception:
            return 'unknown'

def child(obj, index):
    return proxy(obj.GetChildAtIndex(index, dbus_interface=ACCESSIBLE))

def children(obj):
    try:
        count = int(prop(obj, 'ChildCount'))
    except Exception:
        return []
    result = []
    for index in range(count):
        try:
            result.append(child(obj, index))
        except Exception:
            pass
    return result

def actions(obj):
    result = []
    try:
        count = int(prop(obj, 'NActions', ACTION))
        for index in range(min(count, 12)):
            try:
                result.append(str(obj.GetName(index, dbus_interface=ACTION)))
            except Exception:
                pass
    except Exception:
        pass
    return result

def extents(obj):
    try:
        box = obj.GetExtents(0, dbus_interface=COMPONENT)
        return [int(box[0]), int(box[1]), int(box[2]), int(box[3])]
    except Exception:
        return None

def resolve(path):
    parts = path.split('/')
    if not parts or parts[0] != '0':
        raise ValueError(mt('a11y.path_prefix'))
    obj = proxy(root_ref)
    for part in parts[1:]:
        obj = child(obj, int(part))
    return obj

if REQ['operation'] == 'tree':
    nodes = []
    limit = 300

    def walk(obj, path, depth):
        if len(nodes) >= limit or depth > 10:
            return
        nodes.append({
            'path': path,
            'name': name(obj),
            'role': role(obj),
            'box': extents(obj),
            'actions': actions(obj)
        })
        for index, item in enumerate(children(obj)):
            walk(item, path + '/' + str(index), depth + 1)

    walk(proxy(root_ref), '0', 0)
    print(json.dumps({'count': len(nodes), 'truncated': len(nodes) >= limit, 'nodes': nodes}, ensure_ascii=False))
    sys.exit(0)

if REQ['operation'] == 'click':
    try:
        target = resolve(REQ['path'])
        available = actions(target)
        requested = REQ['action'].strip()
        candidates = [requested] if requested else ['click', 'press', 'activate']
        selected = next((item for item in candidates if item in available), None)
        if selected:
            index = available.index(selected)
            target.DoAction(index, dbus_interface=ACTION)
            print(json.dumps({'note': mt('a11y.action_done') + ' ' + selected, 'path': REQ['path'], 'name': name(target)}, ensure_ascii=False))
            sys.exit(0)
        box = extents(target)
        if not box or box[2] <= 0 or box[3] <= 0:
            raise ValueError(mt('a11y.not_clickable'))
        x = box[0] + box[2] // 2
        y = box[1] + box[3] // 2
        registry.GenerateMouseEvent(x, y, 'b1c', dbus_interface=REGISTRY)
        print(json.dumps({'note': mt('a11y.clicked_center'), 'path': REQ['path'], 'x': x, 'y': y, 'name': name(target)}, ensure_ascii=False))
        sys.exit(0)
    except Exception as error:
        print(mt('a11y.click_failed') + str(error), file=sys.stderr)
        sys.exit(3)

print(mt('a11y.err_operation'), file=sys.stderr)
sys.exit(4)
`
