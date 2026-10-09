/**
 * Server engine: a lazy ssh2 connection pool plus the operations the panel
 * needs — exec, status probe, docker management, SFTP file operations,
 * power actions and Wake-on-LAN.
 *
 * Pool model: one connection per alias, created on first use, dropped on
 * close/error or when the host's connection fields change, and reaped after
 * IDLE_TIMEOUT_MS of inactivity. Concurrent channels per connection are
 * fine; every operation resets the idle timer.
 */

import { Client as SshClient, type ClientChannel, type ConnectConfig, type SFTPWrapper } from 'ssh2'
import { Socket as DgramSocket, createSocket } from 'node:dgram'
import { createServer, type Server as NetServer } from 'node:net'
import type { HostEntry, HostStatus, DiskInfo, DockerContainer, RemoteFileEntry, TestResult, TunnelInfo } from './protocol.ts'
import type { HostStore } from './store.ts'

/** Idle connections are closed after this long without traffic. */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000
/** SSH handshake ceiling. */
const READY_TIMEOUT_MS = 15_000
/** Default exec timeout. */
const EXEC_TIMEOUT_MS = 30_000
/** Output guard per stream. */
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024

/** Shell-quote one argument for POSIX sh. */
export function shq(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'"
}

/** Build an ssh2 ConnectConfig from a stored host entry (or a form payload). */
function connectConfigFor(entry: Pick<HostEntry, 'host' | 'port' | 'username' | 'authType' | 'password' | 'privateKey' | 'passphrase'>): ConnectConfig {
  const config: ConnectConfig = {
    host: entry.host,
    port: entry.port,
    username: entry.username,
    readyTimeout: READY_TIMEOUT_MS,
    keepaliveInterval: 20_000,
    keepaliveCountMax: 3,
  }
  if (entry.authType === 'password') config.password = entry.password
  else {
    config.privateKey = entry.privateKey
    if (entry.passphrase) config.passphrase = entry.passphrase
  }
  return config
}

interface PoolEntry {
  client: SshClient
  idleTimer: ReturnType<typeof setTimeout> | undefined
}

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

interface StatusSection {
  [key: string]: string
}

export class ServerEngine {
  private readonly store: HostStore
  private readonly pool = new Map<string, PoolEntry>()
  /** Serialize pool creation per alias so concurrent probes share one handshake. */
  private readonly connecting = new Map<string, Promise<SshClient>>()

  constructor(store: HostStore) {
    this.store = store
  }

  // ------------------------------------------------------------- pool

  private connectConfig(entry: HostEntry): ConnectConfig {
    return connectConfigFor(entry)
  }

  /**
   * Test connectivity for a host payload that may not be saved yet (the
   * form's "test" button). Uses a throwaway connection, never the pool.
   */
  async testPayload(payload: HostEntry): Promise<TestResult> {
    const started = Date.now()
    const client = new SshClient()
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('handshake timed out')), READY_TIMEOUT_MS)
        client.once('ready', () => { clearTimeout(timer); resolve() })
        client.once('error', (error) => { clearTimeout(timer); reject(error) })
        client.connect(connectConfigFor(payload))
      })
      const result = await new Promise<ExecResult>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('probe timed out')), 10_000)
        client.exec("echo __SP_OK__; uname -sr; test -f /etc/synoinfo.conf && echo DSM || echo LINUX", (error, channel) => {
          if (error) { clearTimeout(timer); reject(error); return }
          const chunks: Buffer[] = []
          let code = -1
          channel.on('data', (d: Buffer) => chunks.push(d))
          channel.on('exit', (c: number | null) => { code = c ?? -1 })
          channel.on('close', () => {
            clearTimeout(timer)
            resolve({ code, stdout: Buffer.concat(chunks).toString('utf8'), stderr: '' })
          })
        })
      })
      const latencyMs = Date.now() - started
      if (!result.stdout.includes('__SP_OK__')) {
        return { ok: false, latencyMs, error: result.stdout.trim().slice(0, 300) || `exit ${result.code}` }
      }
      return {
        ok: true,
        latencyMs,
        kind: result.stdout.includes('DSM') ? 'dsm' : 'linux',
        banner: result.stdout.replace('__SP_OK__', '').trim(),
      }
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) }
    } finally {
      try { client.end() } catch { /* ignore */ }
    }
  }

  private drop(alias: string): void {
    const entry = this.pool.get(alias)
    if (!entry) return
    this.pool.delete(alias)
    if (entry.idleTimer) clearTimeout(entry.idleTimer)
    try { entry.client.end() } catch { /* already gone */ }
  }

  /** Drop the pooled connection (config change / delete / repeated failure). */
  invalidate(alias: string): void {
    this.drop(alias)
  }

  private touch(alias: string, entry: PoolEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer)
    entry.idleTimer = setTimeout(() => this.drop(alias), IDLE_TIMEOUT_MS)
    entry.idleTimer.unref?.()
  }

  private connection(alias: string): Promise<SshClient> {
    const pooled = this.pool.get(alias)
    if (pooled) {
      this.touch(alias, pooled)
      return Promise.resolve(pooled.client)
    }
    const pending = this.connecting.get(alias)
    if (pending) return pending
    const host = this.store.get(alias)
    if (!host) return Promise.reject(new Error(`unknown host alias: ${alias}`))
    const promise = new Promise<SshClient>((resolve, reject) => {
      const client = new SshClient()
      let settled = false
      client.on('ready', () => {
        settled = true
        const entry: PoolEntry = { client, idleTimer: undefined }
        this.pool.set(alias, entry)
        this.touch(alias, entry)
        resolve(client)
      })
      client.on('error', (error) => {
        if (!settled) {
          settled = true
          reject(error)
        }
        this.drop(alias)
      })
      client.on('close', () => {
        // Only drop if this client is still the pooled one.
        if (this.pool.get(alias)?.client === client) this.drop(alias)
      })
      try {
        client.connect(this.connectConfig(host))
      } catch (error) {
        reject(error)
      }
    }).finally(() => {
      if (this.connecting.get(alias) === promise) this.connecting.delete(alias)
    })
    this.connecting.set(alias, promise)
    return promise
  }

  // ------------------------------------------------------------- exec

  /**
   * Run one command over the pooled connection. `tolerateAbruptClose` is for
   * power actions: reboot/shutdown kills the session mid-exec, which is the
   * expected success shape.
   */
  async exec(alias: string, command: string, options?: { timeoutMs?: number; tolerateAbruptClose?: boolean }): Promise<ExecResult> {
    const client = await this.connection(alias)
    const timeoutMs = options?.timeoutMs ?? EXEC_TIMEOUT_MS
    return new Promise<ExecResult>((resolve, reject) => {
      let stdoutLen = 0
      let stderrLen = 0
      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []
      let settled = false
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (options?.tolerateAbruptClose) client.removeListener('close', onClientClose)
        fn()
      }
      const timer = setTimeout(() => {
        finish(() => reject(new Error(`exec timed out after ${timeoutMs}ms`)))
        try { stream?.close() } catch { /* ignore */ }
      }, timeoutMs)
      let stream: ClientChannel | undefined
      const onClientClose = (): void => {
        // The whole client dying mid-exec (power action) resolves as success
        // only when the caller opted in.
        if (options?.tolerateAbruptClose) {
          finish(() => resolve({ code: 0, stdout: Buffer.concat(stdoutChunks).toString('utf8'), stderr: '' }))
        }
      }
      client.exec(command, (error, channel) => {
        if (error) {
          finish(() => reject(error))
          return
        }
        stream = channel
        let exitCode = -1
        channel.on('data', (data: Buffer) => {
          if (stdoutLen < MAX_OUTPUT_BYTES) {
            stdoutChunks.push(data)
            stdoutLen += data.length
          }
        })
        channel.stderr.on('data', (data: Buffer) => {
          if (stderrLen < MAX_OUTPUT_BYTES) {
            stderrChunks.push(data)
            stderrLen += data.length
          }
        })
        channel.on('exit', (code: number | null) => {
          exitCode = code ?? -1
        })
        channel.on('close', () => {
          finish(() => resolve({
            code: exitCode,
            stdout: Buffer.concat(stdoutChunks).toString('utf8'),
            stderr: Buffer.concat(stderrChunks).toString('utf8'),
          }))
        })
        channel.on('error', (channelError: Error) => {
          if (options?.tolerateAbruptClose) {
            finish(() => resolve({ code: 0, stdout: Buffer.concat(stdoutChunks).toString('utf8'), stderr: '' }))
          } else {
            finish(() => reject(channelError))
          }
        })
      })
      if (options?.tolerateAbruptClose) client.once('close', onClientClose)
    })
  }

  // ------------------------------------------------------------- probe

  /** Sections probe: one round trip, /proc-based so busybox (DSM) works. */
  private static readonly STATUS_COMMAND = [
    "printf '__HOSTNAME__\\n'; hostname",
    "printf '__KERNEL__\\n'; uname -sr",
    "printf '__UPTIME__\\n'; cat /proc/uptime",
    "printf '__LOAD__\\n'; cat /proc/loadavg",
    "printf '__MEM__\\n'; grep -E '^(MemTotal|MemAvailable|MemFree|Buffers|Cached):' /proc/meminfo",
    "printf '__NPROC__\\n'; grep -c ^processor /proc/cpuinfo",
    "printf '__DSM__\\n'; test -f /etc/synoinfo.conf && echo yes || echo no",
    "printf '__DF__\\n'; df -k 2>/dev/null",
    "printf '__END__\\n'",
  ].join('; ')

  private static parseSections(text: string): StatusSection {
    const sections: StatusSection = {}
    let current = ''
    for (const line of text.split('\n')) {
      const marker = line.match(/^__([A-Z]+)__\s*$/)
      if (marker) {
        current = marker[1]
        sections[current] = ''
      } else if (current) {
        sections[current] += (sections[current] === '' ? '' : '\n') + line
      }
    }
    return sections
  }

  async status(alias: string): Promise<HostStatus> {
    const result = await this.exec(alias, ServerEngine.STATUS_COMMAND, { timeoutMs: 20_000 })
    if (result.code !== 0 && result.stdout.trim() === '') {
      throw new Error(`status probe failed (exit ${result.code}): ${result.stderr.trim().slice(0, 300)}`)
    }
    const sections = ServerEngine.parseSections(result.stdout)
    const uptimeSeconds = Number.parseFloat((sections.UPTIME ?? '0').split(/\s+/)[0] ?? '0') || 0
    const loadParts = (sections.LOAD ?? '').trim().split(/\s+/)
    const mem = { total: 0, available: 0 }
    let memFree = 0, buffers = 0, cached = 0
    for (const line of (sections.MEM ?? '').split('\n')) {
      const match = line.match(/^(\w+):\s+(\d+)\s*kB/)
      if (!match) continue
      const kb = Number.parseInt(match[2], 10)
      if (match[1] === 'MemTotal') mem.total = kb
      else if (match[1] === 'MemAvailable') mem.available = kb
      else if (match[1] === 'MemFree') memFree = kb
      else if (match[1] === 'Buffers') buffers = kb
      else if (match[1] === 'Cached') cached = kb
    }
    if (mem.available === 0) mem.available = memFree + buffers + cached
    const disks: DiskInfo[] = []
    const dfLines = (sections.DF ?? '').split('\n').slice(1)
    const skipFs = /^(tmpfs|devtmpfs|overlay|squashfs|ramfs|none|udev)/
    for (const line of dfLines) {
      const cols = line.trim().split(/\s+/)
      if (cols.length < 6) continue
      const [filesystem, totalKb, usedKb, availKb, usePercent] = cols
      const mount = cols.slice(5).join(' ')
      if (skipFs.test(filesystem)) continue
      if (mount.startsWith('/run') || mount.startsWith('/dev') || mount.startsWith('/sys') || mount.startsWith('/snap')) continue
      const total = Number.parseInt(totalKb, 10)
      if (!Number.isFinite(total) || total <= 0) continue
      disks.push({
        filesystem,
        mount,
        totalKb: total,
        usedKb: Number.parseInt(usedKb, 10) || 0,
        availKb: Number.parseInt(availKb, 10) || 0,
        usePercent: Number.parseInt((usePercent ?? '0').replace('%', ''), 10) || 0,
      })
    }
    const kind = (sections.DSM ?? '').trim() === 'yes' ? 'dsm' : 'linux'
    if (this.store.get(alias)?.detectedKind !== kind) this.store.remember(alias, { detectedKind: kind })
    return {
      hostname: (sections.HOSTNAME ?? '').trim(),
      kernel: (sections.KERNEL ?? '').trim(),
      kind,
      uptimeSeconds,
      loadAvg: [
        Number.parseFloat(loadParts[0] ?? '0') || 0,
        Number.parseFloat(loadParts[1] ?? '0') || 0,
        Number.parseFloat(loadParts[2] ?? '0') || 0,
      ],
      cpuCount: Number.parseInt((sections.NPROC ?? '0').trim(), 10) || 0,
      memTotalKb: mem.total,
      memAvailableKb: mem.available,
      disks,
    }
  }

  /** Quick connectivity probe; also used by the form's test button. */
  async test(alias: string): Promise<TestResult> {
    const started = Date.now()
    try {
      const result = await this.exec(alias, "echo __SP_OK__; uname -sr; test -f /etc/synoinfo.conf && echo DSM || echo LINUX", { timeoutMs: READY_TIMEOUT_MS + 5000 })
      const latencyMs = Date.now() - started
      if (!result.stdout.includes('__SP_OK__')) {
        return { ok: false, latencyMs, error: (result.stderr || result.stdout).trim().slice(0, 300) || `exit ${result.code}` }
      }
      const kind = result.stdout.includes('DSM') ? 'dsm' as const : 'linux' as const
      this.store.remember(alias, { detectedKind: kind })
      return { ok: true, latencyMs, kind, banner: result.stdout.replace('__SP_OK__', '').trim() }
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // ------------------------------------------------------------- docker

  /** Resolve the working docker CLI for a host, caching the answer. */
  async dockerCommand(alias: string): Promise<string> {
    const cached = this.store.get(alias)?.dockerCommand
    if (cached) return cached
    const candidates = ['docker', 'sudo -n docker']
    for (const candidate of candidates) {
      try {
        const probe = await this.exec(alias, `${candidate} version --format '{{.Server.Version}}'`, { timeoutMs: 10_000 })
        if (probe.code === 0 && probe.stdout.trim() !== '') {
          this.store.remember(alias, { dockerCommand: candidate })
          return candidate
        }
      } catch { /* try next */ }
    }
    throw new Error('docker is not reachable on this host (tried "docker" and "sudo -n docker"); check that the SSH user can run docker')
  }

  async dockerList(alias: string): Promise<DockerContainer[]> {
    const docker = await this.dockerCommand(alias)
    const format = "'{{json .}}'"
    const list = await this.exec(alias, `${docker} ps -a --format ${format}`, { timeoutMs: 20_000 })
    if (list.code !== 0) throw new Error(list.stderr.trim() || `docker ps failed (exit ${list.code})`)
    const containers: DockerContainer[] = []
    for (const line of list.stdout.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const row = JSON.parse(trimmed) as Record<string, string>
        containers.push({
          id: row.ID ?? '',
          name: (row.Names ?? '').replace(/^\//, ''),
          image: row.Image ?? '',
          state: row.State ?? '',
          status: row.Status ?? '',
          ports: row.Ports ?? '',
          createdAt: row.CreatedAt ?? '',
        })
      } catch { /* skip malformed line */ }
    }
    // Enrich with one-shot resource stats; failure is non-fatal.
    try {
      const stats = await this.exec(alias, `${docker} stats --no-stream --format ${format}`, { timeoutMs: 15_000 })
      if (stats.code === 0) {
        const byId = new Map(containers.map(c => [c.id, c]))
        for (const line of stats.stdout.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const row = JSON.parse(trimmed) as Record<string, string>
            const target = byId.get(row.ID ?? '') ?? containers.find(c => c.name === (row.Name ?? ''))
            if (target) {
              target.cpuPercent = row.CPUPerc
              target.memUsage = row.MemUsage
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* stats are best-effort */ }
    return containers
  }

  async dockerAction(alias: string, id: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    const docker = await this.dockerCommand(alias)
    if (!/^[a-f0-9]{6,64}$/i.test(id) && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) throw new Error('invalid container id')
    const result = await this.exec(alias, `${docker} ${action} ${shq(id)}`, { timeoutMs: 60_000 })
    if (result.code !== 0) throw new Error(result.stderr.trim() || `docker ${action} failed (exit ${result.code})`)
  }

  async dockerLogs(alias: string, id: string, tail: number): Promise<string> {
    const docker = await this.dockerCommand(alias)
    const safeTail = Math.min(Math.max(Math.floor(tail) || 200, 1), 5000)
    const result = await this.exec(alias, `${docker} logs --tail ${safeTail} ${shq(id)} 2>&1`, { timeoutMs: 30_000 })
    return result.stdout
  }

  /**
   * Open a streaming `docker logs -f` channel for the WebSocket surface.
   * Callers get the raw channel; closing it ends the remote command.
   */
  async dockerLogsChannel(alias: string, id: string, tail: number): Promise<ClientChannel> {
    const client = await this.connection(alias)
    const docker = await this.dockerCommand(alias)
    const safeTail = Math.min(Math.max(Math.floor(tail) || 200, 1), 5000)
    return new Promise((resolve, reject) => {
      client.exec(`${docker} logs -f --tail ${safeTail} ${shq(id)} 2>&1`, (error, channel) => {
        if (error) reject(error)
        else resolve(channel)
      })
    })
  }

  // ------------------------------------------------------------- files

  private withSftp<T>(alias: string, fn: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    return this.connection(alias).then(client => new Promise<T>((resolve, reject) => {
      client.sftp((error, sftp) => {
        if (error) {
          reject(error)
          return
        }
        fn(sftp).then(resolve, reject).finally(() => {
          try { sftp.end() } catch { /* ignore */ }
        })
      })
    }))
  }

  async fileList(alias: string, remotePath: string): Promise<RemoteFileEntry[]> {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (error, list) => {
        if (error) {
          reject(error)
          return
        }
        resolve(list.map(item => ({
          name: item.filename,
          isDir: item.attrs.isDirectory(),
          size: item.attrs.size,
          mtime: item.attrs.mtime,
          mode: item.attrs.mode ?? 0,
        })))
      })
    }))
  }

  /** Open an SFTP read stream; caller pipes it into the HTTP response. */
  async fileDownloadStream(alias: string, remotePath: string): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const client = await this.connection(alias)
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      client.sftp((error, sftp) => error ? reject(error) : resolve(sftp))
    })
    try {
      const stat = await new Promise<{ size: number; isDir: boolean }>((resolve, reject) => {
        sftp.stat(remotePath, (error, stats) => {
          if (error) reject(error)
          else resolve({ size: stats.size, isDir: stats.isDirectory() })
        })
      })
      if (stat.isDir) throw new Error('cannot download a directory')
      const stream = sftp.createReadStream(remotePath)
      // Keep the sftp session alive until the stream ends.
      const cleanup = (): void => { try { sftp.end() } catch { /* ignore */ } }
      stream.on('close', cleanup)
      stream.on('error', cleanup)
      return { stream, size: stat.size }
    } catch (error) {
      try { sftp.end() } catch { /* ignore */ }
      throw error
    }
  }

  async fileMkdir(alias: string, remotePath: string): Promise<void> {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (error) => error ? reject(error) : resolve())
    }))
  }

  async fileRename(alias: string, from: string, to: string): Promise<void> {
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      sftp.rename(from, to, (error) => error ? reject(error) : resolve())
    }))
  }

  /**
   * Delete a remote file (unlink), an empty directory (rmdir), or a whole
   * directory tree when recursive is set (falls back to exec rm -rf).
   */
  async fileDelete(alias: string, remotePath: string, isDir: boolean, recursive: boolean): Promise<void> {
    if (isDir && recursive) {
      if (remotePath === '/' || remotePath.trim() === '') throw new Error('refusing to delete root')
      const result = await this.exec(alias, `rm -rf -- ${shq(remotePath)}`, { timeoutMs: 120_000 })
      if (result.code !== 0) throw new Error(result.stderr.trim() || `rm failed (exit ${result.code})`)
      return
    }
    return this.withSftp(alias, (sftp) => new Promise((resolve, reject) => {
      const done = (error?: Error | null): void => error ? reject(error) : resolve()
      if (isDir) sftp.rmdir(remotePath, done)
      else sftp.unlink(remotePath, done)
    }))
  }

  // ------------------------------------------------------------- terminal

  /**
   * Open an interactive PTY shell on the host. The caller owns the channel:
   * closing it ends the remote shell.
   */
  async shellChannel(alias: string, cols: number, rows: number): Promise<ClientChannel> {
    const client = await this.connection(alias)
    return new Promise((resolve, reject) => {
      client.shell(
        { term: 'xterm-256color', cols: Math.max(cols | 0, 20), rows: Math.max(rows | 0, 5) },
        (error, channel) => error ? reject(error) : resolve(channel),
      )
    })
  }

  // ------------------------------------------------------------- tunnels

  /** Live local-forward tunnels, keyed by `${alias}:${remotePort}`. */
  private readonly tunnels = new Map<string, { server: NetServer; info: TunnelInfo }>()

  listTunnels(alias?: string): TunnelInfo[] {
    return [...this.tunnels.values()]
      .filter(t => alias === undefined || t.info.alias === alias)
      .map(t => t.info)
  }

  /**
   * Open (or reuse) a local forward: 127.0.0.1:<localPort> on the DSH host →
   * 127.0.0.1:<remotePort> on the remote. The URL answers the browser.
   */
  async openTunnel(alias: string, remotePort: number): Promise<TunnelInfo> {
    const key = `${alias}:${remotePort}`
    const existing = this.tunnels.get(key)
    if (existing) return existing.info
    if (!Number.isInteger(remotePort) || remotePort < 1 || remotePort > 65535) throw new Error('invalid remote port')
    const client = await this.connection(alias)
    const server = createServer((socket) => {
      client.forwardOut('127.0.0.1', socket.localPort ?? 0, '127.0.0.1', remotePort, (error, channel) => {
        if (error) { socket.destroy(); return }
        socket.pipe(channel).pipe(socket)
        socket.on('error', () => { try { channel.close() } catch { /* ignore */ } })
        channel.on('error', () => { try { socket.destroy() } catch { /* ignore */ } })
      })
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const localPort = (server.address() as { port: number }).port
    const info: TunnelInfo = { alias, remotePort, localPort, url: `http://127.0.0.1:${localPort}` }
    this.tunnels.set(key, { server, info })
    server.on('close', () => { if (this.tunnels.get(key)?.server === server) this.tunnels.delete(key) })
    return info
  }

  async stopTunnel(alias: string, remotePort: number): Promise<boolean> {
    const key = `${alias}:${remotePort}`
    const entry = this.tunnels.get(key)
    if (!entry) return false
    this.tunnels.delete(key)
    await new Promise<void>((resolve) => { entry.server.close(() => resolve()) })
    return true
  }

  // ------------------------------------------------------------- power

  async power(alias: string, action: 'reboot' | 'shutdown'): Promise<void> {
    const command = action === 'reboot'
      ? 'sudo -n reboot 2>/dev/null || reboot 2>/dev/null || sudo -n systemctl reboot 2>/dev/null || sudo -n shutdown -r now'
      : 'sudo -n shutdown -h now 2>/dev/null || sudo -n poweroff 2>/dev/null || poweroff 2>/dev/null || sudo -n systemctl poweroff'
    const result = await this.exec(alias, command, { timeoutMs: 15_000, tolerateAbruptClose: true })
    // Success shapes: exit 0, or the session dropped before any exit status
    // (-1) — expected when the machine actually goes down. A positive exit
    // code means the command really ran and refused (e.g. no sudo rights).
    if (result.code > 0) {
      throw new Error(result.stderr.trim() || `${action} command failed (exit ${result.code}); does the SSH user have passwordless sudo?`)
    }
    this.drop(alias)
  }

  /** Send a Wake-on-LAN magic packet from the DSH host onto the LAN. */
  async wol(alias: string): Promise<void> {
    const host = this.store.get(alias)
    if (!host) throw new Error(`unknown host alias: ${alias}`)
    const mac = (host.wolMac ?? '').trim()
    const match = mac.match(/^([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})[:-]([0-9a-f]{2})$/i)
    if (!match) throw new Error('this host has no valid wolMac configured')
    const macBytes = Buffer.from(match.slice(1).join(''), 'hex')
    const packet = Buffer.alloc(6 + 16 * 6, 0xff)
    for (let i = 0; i < 16; i++) macBytes.copy(packet, 6 + i * 6)
    const broadcast = (host.wolBroadcast ?? '255.255.255.255').trim() || '255.255.255.255'
    await new Promise<void>((resolve, reject) => {
      const socket: DgramSocket = createSocket('udp4')
      socket.once('error', (error) => { socket.close(); reject(error) })
      socket.bind(() => {
        socket.setBroadcast(true)
        socket.send(packet, 0, packet.length, 9, broadcast, (error) => {
          socket.close()
          if (error) reject(error)
          else resolve()
        })
      })
    })
  }

  // ------------------------------------------------------------- lifecycle

  dispose(): void {
    for (const key of [...this.tunnels.keys()]) {
      const [alias, port] = key.split(':')
      void this.stopTunnel(alias, Number(port))
    }
    for (const alias of [...this.pool.keys()]) this.drop(alias)
  }
}
