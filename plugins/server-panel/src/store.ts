/**
 * Host configuration store: versioned JSON at $DSH_HOME/dsh-server-panel.json
 * (default ~/.dsh), atomic writes, file mode 0600. Same trust model as
 * dsh-ssh: credentials live plaintext in a user-only file.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import type { HostEntry, HostPayload, HostSummary } from './protocol.ts'

const FILE_VERSION = 1

interface StoreFile {
  version: number
  hosts: HostEntry[]
}

/** Resolve the dsh home directory (DSH_HOME env or ~/.dsh). */
function dshHome(): string {
  return process.env.DSH_HOME && process.env.DSH_HOME.trim() !== ''
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
}

const ALIAS_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i

/** Validate a host payload; returns a list of problems (empty = ok). */
export function validateHostPayload(body: Partial<HostPayload>, existing: HostEntry[], originalAlias?: string): string[] {
  const problems: string[] = []
  const alias = (body.alias ?? '').trim()
  if (!ALIAS_RE.test(alias)) problems.push('alias must start with a letter/digit and contain only letters, digits, - and _')
  if (alias !== originalAlias && existing.some(h => h.alias === alias)) problems.push(`alias "${alias}" already exists`)
  if (!body.label || !String(body.label).trim()) problems.push('label is required')
  if (!body.host || !String(body.host).trim()) problems.push('host is required')
  const port = Number(body.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('port must be an integer 1..65535')
  if (!body.username || !String(body.username).trim()) problems.push('username is required')
  if (body.authType !== 'password' && body.authType !== 'key') problems.push('authType must be password or key')
  if (body.authType === 'key' && originalAlias === undefined && !(body.privateKey && body.privateKey.trim()))
    problems.push('privateKey is required for key auth')
  if (body.authType === 'password' && originalAlias === undefined && !(body.password && body.password.length > 0))
    problems.push('password is required for password auth')
  if (body.wolMac && !/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(body.wolMac.trim()))
    problems.push('wolMac must look like 01:23:45:67:89:ab')
  if (body.portals !== undefined) {
    if (!Array.isArray(body.portals)) problems.push('portals must be an array')
    else for (const portal of body.portals) {
      if (!portal.name || !String(portal.name).trim()) problems.push('portal name is required')
      const port = Number(portal.port)
      if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push(`portal "${portal.name ?? '?'}" port must be 1..65535`)
      if (portal.mode !== 'direct' && portal.mode !== 'tunnel') problems.push(`portal "${portal.name ?? '?'}" mode must be direct or tunnel`)
    }
  }
  return problems
}

export class HostStore {
  private readonly file: string
  private hosts: HostEntry[]

  constructor(file?: string) {
    this.file = file ?? join(dshHome(), 'dsh-server-panel.json')
    this.hosts = this.read()
  }

  private read(): HostEntry[] {
    try {
      if (!existsSync(this.file)) return []
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as StoreFile
      if (!Array.isArray(parsed.hosts)) return []
      return parsed.hosts
    } catch {
      return []
    }
  }

  private write(): void {
    const dir = dirname(this.file)
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    const tmp = `${this.file}.tmp-${process.pid}`
    writeFileSync(tmp, JSON.stringify({ version: FILE_VERSION, hosts: this.hosts } satisfies StoreFile, null, 2), { mode: 0o600 })
    renameSync(tmp, this.file)
    try { chmodSync(this.file, 0o600) } catch { /* windows */ }
  }

  list(): HostEntry[] {
    return [...this.hosts]
  }

  get(alias: string): HostEntry | undefined {
    return this.hosts.find(h => h.alias === alias)
  }

  create(payload: HostPayload): HostEntry {
    const problems = validateHostPayload(payload, this.hosts)
    if (problems.length > 0) throw new Error(problems.join('; '))
    const entry: HostEntry = {
      ...payload,
      alias: payload.alias.trim(),
      port: Number(payload.port),
    }
    this.hosts.push(entry)
    this.write()
    return entry
  }

  update(originalAlias: string, patch: Partial<HostPayload>): HostEntry {
    const index = this.hosts.findIndex(h => h.alias === originalAlias)
    if (index < 0) throw new Error(`unknown host alias: ${originalAlias}`)
    const current = this.hosts[index]
    const merged: HostEntry = {
      ...current,
      ...patch,
      alias: (patch.alias ?? current.alias).trim(),
      port: Number(patch.port ?? current.port),
      // Empty credential fields keep the stored secret.
      password: patch.authType === 'key' ? undefined : (patch.password === '' || patch.password === undefined ? current.password : patch.password),
      privateKey: patch.authType === 'password' ? undefined : (patch.privateKey === '' || patch.privateKey === undefined ? current.privateKey : patch.privateKey),
      passphrase: patch.passphrase === '' || patch.passphrase === undefined ? current.passphrase : patch.passphrase,
    }
    const problems = validateHostPayload(merged, this.hosts, originalAlias)
    if (problems.length > 0) throw new Error(problems.join('; '))
    // Connection- or credential-affecting change drops the detection caches.
    if (merged.host !== current.host || merged.port !== current.port || merged.username !== current.username
      || merged.authType !== current.authType || patch.password || patch.privateKey) {
      delete merged.detectedKind
      delete merged.dockerCommand
    }
    this.hosts[index] = merged
    this.write()
    return merged
  }

  remove(alias: string): boolean {
    const before = this.hosts.length
    this.hosts = this.hosts.filter(h => h.alias !== alias)
    if (this.hosts.length !== before) this.write()
    return this.hosts.length !== before
  }

  /** Persist detection caches (kind / working docker command). */
  remember(alias: string, patch: Pick<HostEntry, 'detectedKind' | 'dockerCommand'>): void {
    const entry = this.hosts.find(h => h.alias === alias)
    if (!entry) return
    Object.assign(entry, patch)
    this.write()
  }

  /** Strip secrets for the wire. */
  summarize(entry: HostEntry): HostSummary {
    return {
      alias: entry.alias,
      label: entry.label,
      host: entry.host,
      port: entry.port,
      username: entry.username,
      authType: entry.authType,
      group: entry.group,
      hasPassword: !!entry.password,
      hasKey: !!entry.privateKey,
      wolMac: entry.wolMac,
      wolBroadcast: entry.wolBroadcast,
      notes: entry.notes,
      detectedKind: entry.detectedKind,
      portals: entry.portals,
    }
  }
}
