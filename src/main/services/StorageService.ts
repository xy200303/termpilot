import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import {
  MCP_DEFAULT_PORT,
  MCP_HOST,
  type Appearance,
  type AuthType,
  type ConnectMode,
  type McpAuditEntry,
  type McpSettings,
  type McpSettingsInput,
  type SessionConfig,
  type SessionInput,
  parseAppearance
} from '../../shared/types'
import { hostKeyOf } from '../../shared/host-key'
import { newConnId } from '../../shared/ids'
import { sanitizeSshOptions, type SshConnectOptions } from '../../shared/ssh-options'
import {
  homeRelative,
  listConfigAliases,
  localUsername,
  readConcreteHosts,
  removeSshHost,
  sshConfigPath,
  suggestAlias,
  upsertSshHost,
  type SshHostFields
} from '../ssh-config-file'

/**
 * 会话存储：userData/termpilot.db（Node 内置 SQLite，WAL）+ safeStorage。
 * 密码和私钥口令只以密文写入 secret_encrypted，明文只活在单次连接的内存里。
 * 旧的 sessions.json 在第一次打开数据库时导入，然后改名为 sessions.json.migrated。
 */
export class StorageService {
  private db: DatabaseSync
  private closed = false
  /** 从配置文件导入时先关掉写回，避免刚读进来又改文件。 */
  private sshWrite = true
  private launchApp = ''
  private launchArgs: string[] = []

  constructor() {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    this.db = new DatabaseSync(join(dir, 'termpilot.db'))
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA busy_timeout = 5000')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        group_name TEXT NOT NULL DEFAULT '',
        mode TEXT NOT NULL,
        host TEXT NOT NULL DEFAULT '',
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL DEFAULT '',
        auth_type TEXT NOT NULL,
        key_path TEXT,
        listen_port INTEGER,
        remark TEXT,
        secret_encrypted TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 0,
        port INTEGER NOT NULL DEFAULT ${MCP_DEFAULT_PORT},
        token_encrypted TEXT,
        confirm_dangerous INTEGER NOT NULL DEFAULT 1
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS appearance (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        app_theme TEXT NOT NULL DEFAULT 'light',
        terminal_theme TEXT NOT NULL DEFAULT 'light'
      )
    `)
    this.ensureColumn('appearance', 'experimental_screenshot', 'INTEGER NOT NULL DEFAULT 0')
    this.ensureColumn('sessions', 'jump_host', 'TEXT')
    this.ensureColumn('sessions', 'jump_port', 'INTEGER')
    this.ensureColumn('sessions', 'jump_username', 'TEXT')
    this.ensureColumn('sessions', 'jump_secret_encrypted', 'TEXT')
    this.ensureColumn('sessions', 'ssh_options', 'TEXT')
    this.ensureColumn('sessions', 'public_id', 'TEXT')
    this.ensureColumn('sessions', 'config_host', 'TEXT')
    this.backfillPublicIds()
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_id ON sessions(public_id)')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS open_terms (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        remark TEXT NOT NULL DEFAULT '',
        scrollback TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS host_notes (
        host_key TEXT PRIMARY KEY,
        remark TEXT NOT NULL
      )
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at INTEGER NOT NULL,
        tool TEXT NOT NULL,
        ok INTEGER NOT NULL,
        detail TEXT NOT NULL DEFAULT ''
      )
    `)
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS sessions_config_host ON sessions(config_host) WHERE config_host IS NOT NULL'
    )
    this.importLegacyJson(join(dir, 'sessions.json'))
    this.importSshConfig()
  }

  private backfillPublicIds(): void {
    const rows = this.db.prepare('SELECT id, public_id FROM sessions').all()
    const used = new Set<string>()
    for (const row of rows) {
      const existing = optionalText(row.public_id)
      if (existing) used.add(existing)
    }
    const assign = this.db.prepare('UPDATE sessions SET public_id = ? WHERE id = ?')
    for (const row of rows) {
      if (optionalText(row.public_id)) continue
      let publicId = `conn-${text(row.id).replace(/-/g, '').slice(0, 8)}`
      while (!/^conn-[0-9a-f]{8}$/i.test(publicId) || used.has(publicId)) publicId = newConnId()
      used.add(publicId)
      assign.run(publicId, text(row.id))
    }
  }

  private allocatePublicId(): string {
    for (;;) {
      const publicId = newConnId()
      const taken = this.db.prepare('SELECT 1 FROM sessions WHERE public_id = ?').get(publicId)
      if (!taken) return publicId
    }
  }

  private ensureColumn(table: string, column: string, definition: string): void {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all()
    if (rows.some((row) => row.name === column)) return
    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.db.close()
  }

  /** 命令行在窗口没开时用这个路径把应用拉起来。 */
  setLaunch(appPath: string, args: string[]): void {
    this.launchApp = appPath
    this.launchArgs = args
  }

  list(): SessionConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY created_at ASC, rowid ASC')
      .all()
    return rows.map((row) => this.toPublic(row))
  }

  /** 按主机记一句话，同一台机器上的连接共用。空备注会删掉。 */
  listHostNotes(): Record<string, string> {
    const rows = this.db.prepare('SELECT host_key, remark FROM host_notes').all()
    const notes: Record<string, string> = {}
    for (const row of rows) {
      const key = optionalText(row.host_key)
      const remark = optionalText(row.remark)
      if (key && remark) notes[key] = remark
    }
    return notes
  }

  setHostNote(hostKey: string, remark: string): Record<string, string> {
    const key = hostKeyOf(hostKey)
    const note = remark.trim().slice(0, 80)
    if (!note) this.db.prepare('DELETE FROM host_notes WHERE host_key = ?').run(key)
    else if (this.db.prepare('SELECT host_key FROM host_notes WHERE host_key = ?').get(key)) {
      this.db.prepare('UPDATE host_notes SET remark = ? WHERE host_key = ?').run(note, key)
    } else {
      this.db.prepare('INSERT INTO host_notes (host_key, remark) VALUES (?, ?)').run(key, note)
    }
    return this.listHostNotes()
  }

  create(input: SessionInput): SessionConfig {
    const now = Date.now()
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO sessions (
          id, public_id, name, group_name, mode, host, port, username, auth_type,
          key_path, listen_port, remark, secret_encrypted, created_at, updated_at,
          jump_host, jump_port, jump_username, jump_secret_encrypted, ssh_options
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        this.allocatePublicId(),
        input.name,
        input.group,
        input.mode,
        input.host,
        input.port,
        input.username,
        input.authType,
        input.keyPath ?? null,
        input.listenPort ?? null,
        input.remark ?? null,
        this.encryptSecret(input.secret) ?? null,
        now,
        now,
        input.jumpHost?.trim() || null,
        input.jumpHost?.trim() ? (input.jumpPort ?? 22) : null,
        input.jumpHost?.trim() ? input.jumpUsername?.trim() || null : null,
        input.jumpHost?.trim() ? (this.encryptSecret(input.jumpSecret) ?? null) : null,
        encodeOptions(input.sshOptions)
      )
    const saved = this.require(id)
    this.publishSsh(id)
    return saved
  }

  update(id: string, patch: SessionInput): SessionConfig | null {
    const existing = this.db
      .prepare(
        'SELECT id, secret_encrypted, jump_host, jump_port, jump_username, jump_secret_encrypted, ssh_options FROM sessions WHERE id = ?'
      )
      .get(id)
    if (!existing) return null
    const secret =
      patch.secret !== undefined
        ? (this.encryptSecret(patch.secret) ?? null)
        : (existing.secret_encrypted ?? null)
    const jumpHost = (patch.jumpHost !== undefined ? patch.jumpHost : text(existing.jump_host)).trim()
    const jumpSecret = !jumpHost
      ? null
      : patch.jumpSecret !== undefined
        ? (this.encryptSecret(patch.jumpSecret) ?? null)
        : (existing.jump_secret_encrypted ?? null)
    const jumpPort = patch.jumpPort ?? optionalInteger(existing.jump_port) ?? 22
    const jumpUsername = (patch.jumpUsername !== undefined ? patch.jumpUsername : text(existing.jump_username)).trim()
    const sshOptions = patch.sshOptions === undefined ? (existing.ssh_options ?? null) : encodeOptions(patch.sshOptions)
    this.db
      .prepare(
        `UPDATE sessions SET
          name = ?, group_name = ?, mode = ?, host = ?, port = ?, username = ?,
          auth_type = ?, key_path = ?, listen_port = ?, remark = ?,
          secret_encrypted = ?, updated_at = ?,
          jump_host = ?, jump_port = ?, jump_username = ?, jump_secret_encrypted = ?,
          ssh_options = ?
        WHERE id = ?`
      )
      .run(
        patch.name,
        patch.group,
        patch.mode,
        patch.host,
        patch.port,
        patch.username,
        patch.authType,
        patch.keyPath ?? null,
        patch.listenPort ?? null,
        patch.remark ?? null,
        secret,
        Date.now(),
        jumpHost || null,
        jumpHost ? jumpPort : null,
        jumpHost ? jumpUsername || null : null,
        jumpSecret,
        sshOptions,
        id
      )
    const saved = this.require(id)
    this.publishSsh(id)
    return saved
  }

  delete(id: string): boolean {
    const alias = this.configAlias(id)
    this.db.prepare('DELETE FROM open_terms WHERE session_id = ?').run(id)
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
    if (result.changes > 0 && alias) {
      try {
        removeSshHost(alias)
      } catch (error) {
        console.error('[TermPilot] 从 SSH 配置移除主机失败', error)
      }
    }
    return result.changes > 0
  }

  listOpenTerms(): {
    id: string
    sessionId: string | null
    kind: 'ssh' | 'local'
    title: string
    remark: string
    scrollback: string
  }[] {
    const rows = this.db.prepare('SELECT * FROM open_terms ORDER BY sort_order ASC, rowid ASC').all()
    return rows.flatMap((row) => {
      const kind = row.kind === 'local' ? 'local' : row.kind === 'ssh' ? 'ssh' : null
      if (!kind) return []
      return [
        {
          id: text(row.id),
          sessionId: optionalText(row.session_id) ?? null,
          kind,
          title: text(row.title) || '窗口',
          remark: text(row.remark),
          scrollback: text(row.scrollback)
        }
      ]
    })
  }

  saveOpenTerm(term: {
    id: string
    sessionId: string | null
    kind: 'ssh' | 'local'
    title: string
    remark: string
  }): void {
    const orderRow = this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS n FROM open_terms').get()
    const next = integer(orderRow && 'n' in orderRow ? orderRow.n : 0, 0) + 1
    this.db
      .prepare(
        `INSERT INTO open_terms (id, session_id, kind, title, remark, scrollback, sort_order)
         VALUES (?, ?, ?, ?, ?, '', ?)
         ON CONFLICT(id) DO UPDATE SET
           session_id = excluded.session_id,
           kind = excluded.kind,
           title = excluded.title,
           remark = excluded.remark`
      )
      .run(term.id, term.sessionId, term.kind, term.title, term.remark, next)
  }

  saveTermScrollback(id: string, scrollback: string): void {
    this.db.prepare('UPDATE open_terms SET scrollback = ? WHERE id = ?').run(scrollback.slice(-32_000), id)
  }

  forgetOpenTerm(id: string): void {
    this.db.prepare('DELETE FROM open_terms WHERE id = ?').run(id)
  }

  /** 复制一条连接，凭据密文原样带上，不把密码交回界面 */
  duplicate(id: string): SessionConfig | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
    if (!row) return null
    const now = Date.now()
    const newId = randomUUID()
    this.db
      .prepare(
        `INSERT INTO sessions (
          id, public_id, name, group_name, mode, host, port, username, auth_type,
          key_path, listen_port, remark, secret_encrypted, created_at, updated_at,
          jump_host, jump_port, jump_username, jump_secret_encrypted, ssh_options
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId,
        this.allocatePublicId(),
        this.copyName(text(row.name)),
        text(row.group_name),
        row.mode === 'reverse' ? 'reverse' : 'forward',
        text(row.host),
        integer(row.port, 22),
        text(row.username),
        row.auth_type === 'password' ? 'password' : 'key',
        optionalText(row.key_path) ?? null,
        optionalInteger(row.listen_port) ?? null,
        optionalText(row.remark) ?? null,
        typeof row.secret_encrypted === 'string' ? row.secret_encrypted : null,
        now,
        now,
        optionalText(row.jump_host) ?? null,
        optionalInteger(row.jump_port) ?? null,
        optionalText(row.jump_username) ?? null,
        typeof row.jump_secret_encrypted === 'string' ? row.jump_secret_encrypted : null,
        typeof row.ssh_options === 'string' ? row.ssh_options : null
      )
    const saved = this.require(newId)
    this.publishSsh(newId)
    return saved
  }

  getMcpSettings(): McpSettings {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO mcp_config (id, enabled, port, confirm_dangerous) VALUES (1, 0, ?, 1)'
      )
      .run(MCP_DEFAULT_PORT)
    const row = this.db
      .prepare('SELECT enabled, port, token_encrypted, confirm_dangerous FROM mcp_config WHERE id = 1')
      .get()
    if (!row) throw new Error('MCP 配置不存在')

    let token = this.decryptToken(row.token_encrypted)
    if (!token) {
      token = randomBytes(24).toString('base64url')
      this.db
        .prepare('UPDATE mcp_config SET token_encrypted = ? WHERE id = 1')
        .run(this.encryptSecret(token) ?? null)
    }

    const settings: McpSettings = {
      enabled: flag(row.enabled),
      host: MCP_HOST,
      port: integer(row.port, MCP_DEFAULT_PORT),
      token,
      confirmDangerous: flag(row.confirm_dangerous)
    }
    this.writeMcpFile(settings)
    return settings
  }

  listAudit(limit = 40): McpAuditEntry[] {
    const rows = this.db
      .prepare('SELECT at, tool, ok, detail FROM mcp_audit ORDER BY id DESC LIMIT ?')
      .all(limit)
    return rows.map((row) => ({
      at: integer(row.at, 0),
      tool: text(row.tool),
      ok: flag(row.ok),
      detail: text(row.detail)
    }))
  }

  appendAudit(tool: string, ok: boolean, detail: string): void {
    this.db
      .prepare('INSERT INTO mcp_audit (at, tool, ok, detail) VALUES (?, ?, ?, ?)')
      .run(Date.now(), tool, ok ? 1 : 0, detail.slice(0, 500))
  }

  getAppearance(): Appearance {
    this.db
      .prepare(`INSERT OR IGNORE INTO appearance (id, app_theme, terminal_theme) VALUES (1, 'light', 'light')`)
      .run()
    const row = this.db
      .prepare('SELECT app_theme, terminal_theme, experimental_screenshot FROM appearance WHERE id = 1')
      .get()
    return parseAppearance({
      app: row?.app_theme,
      terminal: row?.terminal_theme,
      experimentalScreenshot: flag(row?.experimental_screenshot ?? 0)
    })
  }

  saveAppearance(input: Appearance): Appearance {
    const next = parseAppearance(input)
    this.getAppearance()
    this.db
      .prepare(
        'UPDATE appearance SET app_theme = ?, terminal_theme = ?, experimental_screenshot = ? WHERE id = 1'
      )
      .run(next.app, next.terminal, next.experimentalScreenshot ? 1 : 0)
    return next
  }

  saveMcpSettings(input: McpSettingsInput): McpSettings {
    if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
      throw new Error('端口需要在 1–65535')
    }
    const token = input.token.trim()
    if (token.length < 16) throw new Error('令牌至少 16 位')
    this.getMcpSettings()
    this.db
      .prepare(
        `UPDATE mcp_config
         SET enabled = ?, port = ?, token_encrypted = ?, confirm_dangerous = ?
         WHERE id = 1`
      )
      .run(input.enabled ? 1 : 0, input.port, this.encryptSecret(token) ?? null, input.confirmDangerous ? 1 : 0)
    return this.getMcpSettings()
  }

  /** 取解密后的凭据，仅供主进程建立 SSH 连接时使用，绝不通过 IPC 返回 */
  getSecret(id: string): string | null {
    return this.readSecret(id, 'secret_encrypted')
  }

  /** 跳板口令。和目标机密码分开存，同样不返回给界面。 */
  getJumpSecret(id: string): string | null {
    return this.readSecret(id, 'jump_secret_encrypted')
  }

  private readSecret(id: string, column: 'secret_encrypted' | 'jump_secret_encrypted'): string | null {
    const row = this.db.prepare(`SELECT ${column} AS secret FROM sessions WHERE id = ?`).get(id)
    const encrypted = row?.secret
    if (typeof encrypted !== 'string' || encrypted.length === 0) return null
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      return null
    }
  }

  private require(id: string): SessionConfig {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
    if (!row) throw new Error(`会话不存在: ${id}`)
    return this.toPublic(row)
  }

  private toPublic(row: Record<string, SQLOutputValue>): SessionConfig {
    const auth = row.auth_type === 'password' ? 'password' : 'key'
    const mode: ConnectMode = row.mode === 'reverse' ? 'reverse' : 'forward'
    return {
      id: text(row.id),
      publicId: text(row.public_id),
      name: text(row.name),
      group: text(row.group_name),
      mode,
      host: text(row.host),
      port: integer(row.port, 22),
      username: text(row.username),
      authType: auth satisfies AuthType,
      keyPath: optionalText(row.key_path),
      listenPort: optionalInteger(row.listen_port),
      remark: optionalText(row.remark),
      hasSecret: typeof row.secret_encrypted === 'string' && row.secret_encrypted.length > 0,
      jumpHost: optionalText(row.jump_host),
      jumpPort: optionalInteger(row.jump_port),
      jumpUsername: optionalText(row.jump_username),
      hasJumpSecret: typeof row.jump_secret_encrypted === 'string' && row.jump_secret_encrypted.length > 0,
      sshOptions: decodeOptions(row.ssh_options),
      createdAt: integer(row.created_at, 0),
      updatedAt: integer(row.updated_at, 0)
    }
  }

  /** 启动时把 ~/.ssh/config 里的具体主机读进来。已关联的连接只更新 OpenSSH 字段。 */
  private importSshConfig(): void {
    const file = sshConfigPath()
    if (!existsSync(file)) return
    let hosts: { alias: string; fields: SshHostFields }[]
    try {
      hosts = readConcreteHosts(readFileSync(file, 'utf8'))
    } catch (error) {
      console.error('[TermPilot] 读取 SSH 配置失败', error)
      return
    }
    this.sshWrite = false
    try {
      for (const host of hosts) {
        if (!host.fields.hostName.trim()) continue
        const row = this.db.prepare('SELECT id FROM sessions WHERE config_host = ?').get(host.alias)
        if (row && typeof row.id === 'string') {
          this.applyConfig(row.id, host.fields)
          continue
        }
        const same = this
          .list()
          .filter(
            (session) =>
              session.mode === 'forward' &&
              !this.configAlias(session.id) &&
              session.host === host.fields.hostName &&
              session.port === host.fields.port &&
              session.username === (host.fields.username || localUsername())
          )
        if (same.length === 1) {
          this.db.prepare('UPDATE sessions SET config_host = ? WHERE id = ?').run(host.alias, same[0]!.id)
          this.applyConfig(same[0]!.id, host.fields)
        } else {
          this.insertConfig(host.alias, host.fields)
        }
      }
    } catch (error) {
      console.error('[TermPilot] 导入 SSH 配置失败', error)
    } finally {
      this.sshWrite = true
    }
  }

  private insertConfig(alias: string, fields: SshHostFields): void {
    const [keyPath, ...rest] = fields.identityFiles
    const [jump, ...extra] = fields.jumps
    const session = this.create({
      name: this.uniqueName(alias),
      group: '',
      mode: 'forward',
      host: fields.hostName,
      port: fields.port,
      username: fields.username || localUsername(),
      authType: keyPath ? 'key' : 'password',
      keyPath,
      remark: '',
      jumpHost: jump?.host ?? '',
      jumpPort: jump?.port,
      jumpUsername: jump?.username,
      sshOptions: configOptions(rest, extra, fields.proxyCommand)
    })
    this.db.prepare('UPDATE sessions SET config_host = ? WHERE id = ?').run(alias, session.id)
  }

  private applyConfig(id: string, fields: SshHostFields): void {
    const row = this.db.prepare('SELECT ssh_options, jump_host, jump_secret_encrypted FROM sessions WHERE id = ?').get(id)
    if (!row) return
    const [keyPath, ...rest] = fields.identityFiles
    const [jump, ...extra] = fields.jumps
    const previousJump = optionalText(row.jump_host) ?? ''
    const jumpHost = jump?.host ?? ''
    const keepSecret = jumpHost !== '' && jumpHost === previousJump
    this.db
      .prepare(
        `UPDATE sessions SET
          host = ?, port = ?, username = ?, auth_type = ?, key_path = ?,
          jump_host = ?, jump_port = ?, jump_username = ?, jump_secret_encrypted = ?,
          ssh_options = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        fields.hostName,
        fields.port,
        fields.username || localUsername(),
        keyPath ? 'key' : 'password',
        keyPath ?? null,
        jumpHost || null,
        jumpHost ? (jump?.port ?? 22) : null,
        jumpHost ? jump?.username || null : null,
        keepSecret ? (row.jump_secret_encrypted ?? null) : null,
        encodeOptions(configOptions(rest, extra, fields.proxyCommand, decodeOptions(row.ssh_options))),
        Date.now(),
        id
      )
  }

  private publishSsh(id: string): void {
    if (!this.sshWrite) return
    try {
      const session = this.require(id)
      if (session.mode !== 'forward' || !session.host.trim()) {
        this.dropSshAlias(id)
        return
      }
      upsertSshHost(this.ensureAlias(session), fieldsFromSession(session))
    } catch (error) {
      console.error('[TermPilot] 写回 SSH 配置失败', error)
    }
  }

  private ensureAlias(session: SessionConfig): string {
    const current = this.configAlias(session.id)
    if (current) return current
    const taken = listConfigAliases()
    for (const row of this.db.prepare('SELECT config_host FROM sessions WHERE config_host IS NOT NULL').all()) {
      if (typeof row.config_host === 'string') taken.add(row.config_host)
    }
    const alias = suggestAlias(session.name, session.publicId, taken)
    this.db.prepare('UPDATE sessions SET config_host = ? WHERE id = ?').run(alias, session.id)
    return alias
  }

  private dropSshAlias(id: string): void {
    const alias = this.configAlias(id)
    if (!alias) return
    this.db.prepare('UPDATE sessions SET config_host = NULL WHERE id = ?').run(id)
    removeSshHost(alias)
  }

  private configAlias(id: string): string | null {
    const row = this.db.prepare('SELECT config_host FROM sessions WHERE id = ?').get(id)
    return row && typeof row.config_host === 'string' && row.config_host ? row.config_host : null
  }

  private uniqueName(base: string): string {
    const taken = new Set(this.list().map((session) => session.name))
    if (!taken.has(base)) return base
    let n = 2
    while (taken.has(`${base} ${n}`)) n += 1
    return `${base} ${n}`
  }

  private importLegacyJson(file: string): void {
    if (!existsSync(file)) return
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'))
      if (!Array.isArray(parsed)) throw new Error('sessions.json 不是数组')
    } catch {
      renameSync(file, `${file}.bak`)
      return
    }

    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO sessions (
        id, name, group_name, mode, host, port, username, auth_type,
        key_path, listen_port, remark, secret_encrypted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.db.exec('BEGIN')
    try {
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        if (typeof row.id !== 'string' || row.id.length === 0) continue
        const now = Date.now()
        const auth = row.authType === 'password' ? 'password' : 'key'
        const mode = row.mode === 'reverse' ? 'reverse' : 'forward'
        insert.run(
          row.id,
          typeof row.name === 'string' ? row.name : '未命名',
          typeof row.group === 'string' ? row.group : '',
          mode,
          typeof row.host === 'string' ? row.host : '',
          typeof row.port === 'number' ? row.port : 22,
          typeof row.username === 'string' ? row.username : '',
          auth,
          typeof row.keyPath === 'string' ? row.keyPath : null,
          typeof row.listenPort === 'number' ? row.listenPort : null,
          typeof row.remark === 'string' ? row.remark : null,
          typeof row.secretEncrypted === 'string' ? row.secretEncrypted : null,
          typeof row.createdAt === 'number' ? row.createdAt : now,
          typeof row.updatedAt === 'number' ? row.updatedAt : now
        )
      }
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
    renameSync(file, `${file}.migrated`)
  }

  private copyName(name: string): string {
    const base = name.replace(/ 副本(?: \d+)?$/, '') || name
    const taken = new Set(this.list().map((session) => session.name))
    const first = `${base} 副本`
    if (!taken.has(first)) return first
    let n = 2
    while (taken.has(`${base} 副本 ${n}`)) n += 1
    return `${base} 副本 ${n}`
  }

  /** 给本机 Agent 自己注册 MCP 用。令牌只写在 userData，不进仓库。 */
  private writeMcpFile(settings: McpSettings): void {
    const file = join(app.getPath('userData'), 'mcp.json')
    writeFileSync(
      file,
      `${JSON.stringify(
        {
          name: 'termpilot',
          url: `http://${settings.host}:${settings.port}/mcp`,
          token: settings.token,
          enabled: settings.enabled,
          cli: join(app.getPath('userData'), 'bin', process.platform === 'win32' ? 'termpilot.exe' : 'termpilot'),
          app: this.launchApp,
          args: this.launchArgs
        },
        null,
        2
      )}\n`,
      'utf8'
    )
  }

  private encryptSecret(secret?: string): string | undefined {
    if (!secret) return undefined
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统钥匙串不可用，无法安全保存凭据')
    }
    return safeStorage.encryptString(secret).toString('base64')
  }

  private decryptToken(value: SQLOutputValue): string | null {
    if (typeof value !== 'string' || value.length === 0) return null
    try {
      return safeStorage.decryptString(Buffer.from(value, 'base64'))
    } catch {
      return null
    }
  }
}

function text(value: SQLOutputValue): string {
  return typeof value === 'string' ? value : ''
}

function optionalText(value: SQLOutputValue): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function integer(value: SQLOutputValue, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return fallback
}

function optionalInteger(value: SQLOutputValue): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return undefined
}

function flag(value: SQLOutputValue): boolean {
  return value === 1 || value === 1n
}

function fieldsFromSession(session: SessionConfig): SshHostFields {
  const files =
    session.authType === 'key' && session.keyPath
      ? [session.keyPath, ...(session.sshOptions?.keyPaths ?? [])].map(homeRelative)
      : []
  const jumps = session.jumpHost?.trim()
    ? [
        {
          host: session.jumpHost.trim(),
          port: session.jumpPort ?? 22,
          username: session.jumpUsername?.trim() ?? ''
        },
        ...(session.sshOptions?.extraJumps ?? [])
      ]
    : []
  return {
    hostName: session.host.trim(),
    port: session.port,
    username: session.username.trim(),
    identityFiles: files,
    jumps,
    proxyCommand: session.sshOptions?.proxyCommand
  }
}

function configOptions(
  keyPaths: string[],
  extraJumps: SshHostFields['jumps'],
  proxyCommand: string | undefined,
  previous?: SshConnectOptions
): SshConnectOptions | undefined {
  const options: SshConnectOptions = { ...(previous ?? {}) }
  if (keyPaths.length > 0) options.keyPaths = keyPaths
  else delete options.keyPaths
  if (extraJumps.length > 0) options.extraJumps = extraJumps
  else delete options.extraJumps
  if (proxyCommand) options.proxyCommand = proxyCommand
  else delete options.proxyCommand
  return sanitizeSshOptions(options)
}

function encodeOptions(value: SessionInput['sshOptions']): string | null {
  if (!value) return null
  const clean = sanitizeSshOptions(value)
  return clean ? JSON.stringify(clean) : null
}

function decodeOptions(value: SQLOutputValue): SessionConfig['sshOptions'] {
  if (typeof value !== 'string' || value.length === 0) return undefined
  try {
    return sanitizeSshOptions(JSON.parse(value))
  } catch {
    return undefined
  }
}
