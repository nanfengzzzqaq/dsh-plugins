/**
 * Shared protocol constants and wire types between the host routes and the
 * browser client. Both halves bundle this file; keep it dependency-free.
 */

/** API path family. All routes are loopback-only on the host. */
export const API = {
  hosts: '/api/dsh-server-panel/hosts',
  test: '/api/dsh-server-panel/test',
  status: '/api/dsh-server-panel/status',
  dockerContainers: '/api/dsh-server-panel/docker/containers',
  dockerAction: '/api/dsh-server-panel/docker/action',
  dockerLogs: '/api/dsh-server-panel/docker/logs',
  power: '/api/dsh-server-panel/power',
  wol: '/api/dsh-server-panel/wol',
  filesList: '/api/dsh-server-panel/files/list',
  filesDownload: '/api/dsh-server-panel/files/download',
  filesMkdir: '/api/dsh-server-panel/files/mkdir',
  filesRename: '/api/dsh-server-panel/files/rename',
  filesDelete: '/api/dsh-server-panel/files/delete',
  /** WebSocket upgrade path for streaming docker logs. */
  dockerLogsFollow: '/api/dsh-server-panel/docker/logs-follow',
} as const

export type AuthType = 'password' | 'key'

/** Host configuration as the user edits it in the form (and as stored). */
export interface HostPayload {
  alias: string
  label: string
  host: string
  port: number
  username: string
  authType: AuthType
  password?: string
  privateKey?: string
  passphrase?: string
  group?: string
  /** MAC address used by Wake-on-LAN. */
  wolMac?: string
  /** Broadcast address for the magic packet; default 255.255.255.255. */
  wolBroadcast?: string
  notes?: string
}

/** Stored host entry: payload plus detection cache. */
export interface HostEntry extends HostPayload {
  /** Detected host flavor from the last successful probe. */
  detectedKind?: 'dsm' | 'linux'
  /** Docker CLI that worked on this host ('docker' or 'sudo -n docker'). */
  dockerCommand?: string
}

/** Host summary returned to the client (credentials stripped). */
export interface HostSummary {
  alias: string
  label: string
  host: string
  port: number
  username: string
  authType: AuthType
  group?: string
  hasPassword: boolean
  hasKey: boolean
  wolMac?: string
  wolBroadcast?: string
  notes?: string
  detectedKind?: 'dsm' | 'linux'
}

export interface TestResult {
  ok: boolean
  latencyMs?: number
  banner?: string
  kind?: 'dsm' | 'linux'
  error?: string
}

export interface DiskInfo {
  filesystem: string
  mount: string
  totalKb: number
  usedKb: number
  availKb: number
  usePercent: number
}

export interface HostStatus {
  hostname: string
  kernel: string
  kind: 'dsm' | 'linux'
  uptimeSeconds: number
  loadAvg: [number, number, number]
  cpuCount: number
  memTotalKb: number
  memAvailableKb: number
  disks: DiskInfo[]
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string
  createdAt: string
  /** Present when `docker stats --no-stream` succeeded. */
  cpuPercent?: string
  memUsage?: string
}

export interface RemoteFileEntry {
  name: string
  isDir: boolean
  size: number
  mtime: number
  mode: number
}

export type PowerAction = 'reboot' | 'shutdown'
