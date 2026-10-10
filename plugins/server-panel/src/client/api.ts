/**
 * Browser-side API client for the /api/dsh-server-panel route family.
 * Plain same-origin fetch / WebSocket — the only data path the panel uses.
 */

import {
  API,
  type DockerContainer,
  type HostEntry,
  type HostPayload,
  type HostStatus,
  type HostSummary,
  type RemoteFileEntry,
  type TestResult,
  type TunnelInfo,
} from '../protocol.ts'
import { tt } from './i18n.ts'

export class ServerPanelApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServerPanelApiError'
  }
}

/**
 * The ws(s) base for socket routes. A web page dials its own origin; an
 * application-delivered page (the DSH Desktop shell serves its GUI from
 * dsh-app://app/) cannot carry a socket on its own scheme — its protocol
 * handler forwards HTTP but has no upgrade to forward — so the socket goes
 * to the shell-published loopback authority (__DSH_TRANSPORT__.streamBaseUrl).
 */
function socketBase(): { protocol: string; host: string } | undefined {
  const protocol = window.location.protocol
  if (protocol === 'http:' || protocol === 'https:') {
    return { protocol: protocol === 'https:' ? 'wss:' : 'ws:', host: window.location.host }
  }
  const published = (globalThis as { __DSH_TRANSPORT__?: { streamBaseUrl?: unknown } }).__DSH_TRANSPORT__?.streamBaseUrl
  if (typeof published === 'string' && published !== '') {
    try {
      const url = new URL(published)
      if ((url.protocol === 'http:' || url.protocol === 'https:') && url.host !== '' && url.username === '' && url.password === '') {
        return { protocol: url.protocol === 'https:' ? 'wss:' : 'ws:', host: url.host }
      }
    } catch { /* fall through */ }
  }
  return undefined
}

async function readJson<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ServerPanelApiError(`HTTP ${response.status}: invalid JSON response`)
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `HTTP ${response.status}`
    throw new ServerPanelApiError(message)
  }
  return body as T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text === '' ? '' : '?' + text
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return readJson<T>(await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

export class ServerPanelApi {
  async listHosts(): Promise<HostSummary[]> {
    const data = await readJson<{ hosts: HostSummary[] }>(await fetch(API.hosts))
    return data.hosts
  }

  async createHost(payload: HostPayload): Promise<HostSummary> {
    const data = await post<{ host: HostSummary }>(API.hosts, payload)
    return data.host
  }

  async updateHost(alias: string, patch: Partial<HostPayload>): Promise<HostSummary> {
    const data = await readJson<{ host: HostSummary }>(await fetch(API.hosts + query({ alias }), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }))
    return data.host
  }

  async deleteHost(alias: string): Promise<void> {
    await readJson(await fetch(API.hosts + query({ alias }), { method: 'DELETE' }))
  }

  /** Test a saved host. */
  async testSaved(alias: string): Promise<TestResult> {
    return post<TestResult>(API.test, { alias })
  }

  /** Test an unsaved form payload (throwaway connection on the host). */
  async testHost(payload: Partial<HostPayload> & { host: string; username: string }): Promise<TestResult> {
    return post<TestResult>(API.test, { payload })
  }

  async status(alias: string): Promise<HostStatus> {
    const data = await readJson<{ status: HostStatus }>(await fetch(API.status + query({ alias })))
    return data.status
  }

  async dockerContainers(alias: string): Promise<DockerContainer[]> {
    const data = await readJson<{ containers: DockerContainer[] }>(await fetch(API.dockerContainers + query({ alias })))
    return data.containers
  }

  async dockerAction(alias: string, id: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    await post(API.dockerAction, { alias, id, action })
  }

  async dockerLogs(alias: string, id: string, tail = 200): Promise<string> {
    const data = await readJson<{ logs: string }>(await fetch(API.dockerLogs + query({ alias, id, tail })))
    return data.logs
  }

  /** WebSocket URL for the streaming logs endpoint; undefined when this page cannot carry a socket. */
  dockerLogsFollowUrl(alias: string, id: string, tail = 200): string | undefined {
    const base = socketBase()
    if (base === undefined) return undefined
    return `${base.protocol}//${base.host}${API.dockerLogsFollow}${query({ alias, id, tail })}`
  }

  /** WebSocket URL for the interactive terminal; undefined when this page cannot carry a socket. */
  terminalUrl(alias: string, cols: number, rows: number): string | undefined {
    const base = socketBase()
    if (base === undefined) return undefined
    return `${base.protocol}//${base.host}${API.terminal}${query({ alias, cols, rows })}`
  }

  /** Open (or reuse) an SSH local-forward and answer the URL to open. */
  async openTunnel(alias: string, port: number): Promise<TunnelInfo> {
    const data = await post<{ tunnel: TunnelInfo }>(API.tunnel, { alias, port })
    return data.tunnel
  }

  async listTunnels(alias: string): Promise<TunnelInfo[]> {
    const data = await readJson<{ tunnels: TunnelInfo[] }>(await fetch(API.tunnels + query({ alias })))
    return data.tunnels
  }

  async stopTunnel(alias: string, port: number): Promise<void> {
    await readJson(await fetch(API.tunnels + query({ alias, port }), { method: 'DELETE' }))
  }

  async power(alias: string, action: 'reboot' | 'shutdown'): Promise<void> {
    await post(API.power, { alias, action })
  }

  async wol(alias: string): Promise<void> {
    await post(API.wol, { alias })
  }

  async fileList(alias: string, path: string): Promise<RemoteFileEntry[]> {
    const data = await readJson<{ entries: RemoteFileEntry[] }>(await fetch(API.filesList + query({ alias, path })))
    return data.entries
  }

  /** Browser-save a remote file. */
  async fileDownload(alias: string, path: string): Promise<void> {
    const response = await fetch(API.filesDownload + query({ alias, path }))
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new ServerPanelApiError(text || `HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const name = path.replace(/\/+$/, '').split('/').pop() ?? 'download'
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async fileMkdir(alias: string, path: string): Promise<void> {
    await post(API.filesMkdir, { alias, path })
  }

  async fileRename(alias: string, from: string, to: string): Promise<void> {
    await post(API.filesRename, { alias, from, to })
  }

  async fileDelete(alias: string, path: string, isDir: boolean, recursive: boolean): Promise<void> {
    await post(API.filesDelete, { alias, path, isDir, recursive })
  }
}

/** Shared format helpers. */
export function formatBytes(kb: number): string {
  if (!Number.isFinite(kb) || kb < 0) return '-'
  if (kb < 1024) return `${kb} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  if (gb < 1024) return `${gb.toFixed(1)} GB`
  return `${(gb / 1024).toFixed(2)} TB`
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes / 1024)
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export { tt }
