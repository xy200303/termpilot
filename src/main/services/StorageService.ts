import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
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

/**
 * 会话存储：userData/termpilot.db（Node 内置 SQLite，WAL）+ safeStorage。
 * 密码和私钥口令只以密文写入 secret_encrypted，明文只活在单次连接的内存里。
 * 旧的 sessions.json 在第一次打开数据库时导入，然后改名为 sessions.json.migrated。
 */
export class StorageService {
  private db: DatabaseSync
  private closed = false

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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at INTEGER NOT NULL,
        tool TEXT NOT NULL,
        ok INTEGER NOT NULL,
        detail TEXT NOT NULL DEFAULT ''
      )
    `)
    this.importLegacyJson(join(dir, 'sessions.json'))
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.db.close()
  }

  list(): SessionConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY created_at ASC, rowid ASC')
      .all()
    return rows.map((row) => this.toPublic(row))
  }

  create(input: SessionInput): SessionConfig {
    const now = Date.now()
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO sessions (
          id, name, group_name, mode, host, port, username, auth_type,
          key_path, listen_port, remark, secret_encrypted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
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
        now
      )
    return this.require(id)
  }

  update(id: string, patch: SessionInput): SessionConfig | null {
    const existing = this.db.prepare('SELECT id, secret_encrypted FROM sessions WHERE id = ?').get(id)
    if (!existing) return null
    const secret =
      patch.secret !== undefined
        ? (this.encryptSecret(patch.secret) ?? null)
        : (existing.secret_encrypted ?? null)
    this.db
      .prepare(
        `UPDATE sessions SET
          name = ?, group_name = ?, mode = ?, host = ?, port = ?, username = ?,
          auth_type = ?, key_path = ?, listen_port = ?, remark = ?,
          secret_encrypted = ?, updated_at = ?
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
        id
      )
    return this.require(id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
    return result.changes > 0
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
          id, name, group_name, mode, host, port, username, auth_type,
          key_path, listen_port, remark, secret_encrypted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId,
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
        now
      )
    return this.require(newId)
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

    return {
      enabled: flag(row.enabled),
      host: MCP_HOST,
      port: integer(row.port, MCP_DEFAULT_PORT),
      token,
      confirmDangerous: flag(row.confirm_dangerous)
    }
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
    const row = this.db.prepare('SELECT app_theme, terminal_theme FROM appearance WHERE id = 1').get()
    return parseAppearance({ app: row?.app_theme, terminal: row?.terminal_theme })
  }

  saveAppearance(input: Appearance): Appearance {
    const next = parseAppearance(input)
    this.getAppearance()
    this.db
      .prepare('UPDATE appearance SET app_theme = ?, terminal_theme = ? WHERE id = 1')
      .run(next.app, next.terminal)
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
    const row = this.db.prepare('SELECT secret_encrypted FROM sessions WHERE id = ?').get(id)
    const encrypted = row?.secret_encrypted
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
      createdAt: integer(row.created_at, 0),
      updatedAt: integer(row.updated_at, 0)
    }
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
