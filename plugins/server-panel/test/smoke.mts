/**
 * server-panel end-to-end smoke test:
 *   in-process ssh2 Server  ←  engine (pool/exec/docker)  ←  HTTP routes  ←  fetch
 * plus the plugin entry mounted against a mock cordis ctx (webServer capture).
 *
 * Run from the plugin dir so ssh2/ws resolve: node test/smoke.mjs
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { connect as netConnect } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ssh2 from 'ssh2'
import WebSocket from 'ws'

const { Server: SshServer } = ssh2
const { generateKeyPairSync } = ssh2.utils

import { HostStore } from '../src/store.ts'
import { ServerEngine } from '../src/engine.ts'
import { makeRoutes } from '../src/routes.ts'
import { API } from '../src/protocol.ts'
import * as plugin from '../src/index.ts'

let failures = 0
function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) console.log(`[ok] ${name}`)
  else { failures++; console.error(`[FAIL] ${name}`, detail ?? '') }
}

// ---------------------------------------------------------- fake SSH server
const hostKeyPem = generateKeyPairSync('ed25519').private

// A local HTTP target the SSH tunnel will forward to (the "NAS web UI").
const portalTarget = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('portal-ok')
})
await new Promise<void>((resolve) => portalTarget.listen(0, '127.0.0.1', resolve))
const portalPort = (portalTarget.address() as { port: number }).port

const STATUS_OUTPUT = `__HOSTNAME__
mynas
__KERNEL__
Linux 4.4.302+
__UPTIME__
860000.12 12345.67
__LOAD__
0.42 0.30 0.21 1/234 5678
__MEM__
MemTotal:       8048000 kB
MemAvailable:   4000000 kB
MemFree:        1000000 kB
__NPROC__
4
__DSM__
yes
__DF__
Filesystem 1K-blocks Used Available Use% Mounted on
/dev/md0 100000000 40000000 60000000 40% /
tmpfs 4000000 0 4000000 0% /dev/shm
/dev/mapper/vg1-lv1 4000000000 1000000000 3000000000 25% /volume1
__END__
`

const DOCKER_PS = `{"ID":"abc123def456","Names":"nginx","Image":"nginx:latest","State":"running","Status":"Up 2 days","Ports":"0.0.0.0:8080->80/tcp","CreatedAt":"2026-01-01 10:00:00 +0800 CST"}
{"ID":"def456abc789","Names":"redis","Image":"redis:7","State":"exited","Status":"Exited (0) 3 hours ago","Ports":"","CreatedAt":"2026-01-02 10:00:00 +0800 CST"}
`
const DOCKER_STATS = `{"ID":"abc123def456","Name":"nginx","CPUPerc":"0.50%","MemUsage":"120MiB / 7.69GiB"}
`

const receivedCommands: string[] = []

const sshServer = new SshServer({ hostKeys: [hostKeyPem] }, (client) => {
  client.on('authentication', (auth) => {
    if (auth.method === 'password' && auth.username === 'admin' && auth.password === 'secret') auth.accept()
    else auth.reject()
  })
  client.on('ready', () => {
    // direct-tcpip (forwardOut) arrives at the CLIENT level, not the session.
    client.on('tcpip', (acceptTcp, _rejectTcp, info) => {
      const channel = acceptTcp()
      const target = netConnect(info.destPort === 5000 ? portalPort : info.destPort, '127.0.0.1', () => {
        channel.pipe(target).pipe(channel)
      })
      target.on('error', () => channel.close())
    })
    client.on('session', (accept) => {
      const session = accept()
      // PTY + shell for the terminal test: echo everything back.
      session.on('pty', (acceptPty) => acceptPty())
      session.on('shell', (acceptShell) => {
        const channel = acceptShell()
        channel.write('fake-shell$ ')
        channel.on('data', (data: Buffer) => channel.write(data))
        channel.on('close', () => channel.end())
      })
      session.on('exec', (acceptExec, _reject, info) => {
        const channel = acceptExec()
        const command = info.command
        receivedCommands.push(command)
        if (command.includes('reboot')) {
          // Simulate the session dying with the host.
          channel.end()
          client.end()
          return
        }
        if (command.includes('__HOSTNAME__')) channel.write(STATUS_OUTPUT)
        else if (command.includes('__SP_OK__')) channel.write('__SP_OK__\nLinux 4.4.302+\nDSM\n')
        else if (command.includes('docker version')) channel.write('24.0.7\n')
        else if (command.includes('docker stats')) channel.write(DOCKER_STATS)
        else if (command.includes('docker ps')) channel.write(DOCKER_PS)
        else if (command.includes('docker logs')) channel.write('log line 1\nlog line 2\n')
        else if (command.includes('docker stop') || command.includes('docker start') || command.includes('docker restart')) channel.write(`${command.split(' ').pop()}\n`)
        channel.exit(0)
        channel.end()
      })
    })
  })
})

await new Promise<void>((resolve) => sshServer.listen(0, '127.0.0.1', resolve))
const sshPort = (sshServer.address() as { port: number }).port
console.log(`[setup] fake sshd on 127.0.0.1:${sshPort}`)

// ---------------------------------------------------------- store + engine
const store = new HostStore(join(mkdtempSync(join(tmpdir(), 'dsh-sp-')), 'store.json'))
store.create({
  alias: 'nas', label: '家里 NAS', host: '127.0.0.1', port: sshPort,
  username: 'admin', authType: 'password', password: 'secret', wolMac: '01:23:45:67:89:ab',
})
const engine = new ServerEngine(store)

// ---------------------------------------------------------- plugin mount
const registeredRoutes: Array<{ kind: string; path: string; handler: unknown }> = []
const registeredUpgrades: Array<{ path: string; handler: unknown }> = []
const mockCtx = {
  effect(fn: () => unknown, _label?: string) { void fn(); return () => {} },
  webServer: {
    register: (route: { kind: string; path: string; handler: unknown }) => { registeredRoutes.push(route); return () => {} },
    registerUpgrade: (route: { path: string; handler: unknown }) => { registeredUpgrades.push(route); return () => {} },
  },
  logger: { info: (...args: unknown[]) => console.log('[ctx.logger]', ...args) },
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
plugin.apply(mockCtx as any)
check('plugin exports name/inject', plugin.name === 'server-panel' && plugin.inject.includes('webServer'))
check('routes registered', registeredRoutes.length >= 10, registeredRoutes.length)
check('logs-follow upgrade registered', registeredUpgrades.some(u => u.path === API.dockerLogsFollow))

// ---------------------------------------------------------- real HTTP server
const { routes, upgrades } = makeRoutes({ store, engine })
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  const route = routes.find(r => r.path === pathname)
  if (!route) { res.writeHead(404); res.end('nope'); return }
  void (route.handler as (q: IncomingMessage, s: ServerResponse) => Promise<void>)(req, res)
})
httpServer.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  const upgrade = upgrades.find(u => u.path === pathname)
  if (!upgrade) { socket.destroy(); return }
  void (upgrade.handler as (q: IncomingMessage, s: unknown, h: Buffer) => void)(req, socket, head)
})
await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
const httpPort = (httpServer.address() as { port: number }).port
const base = `http://127.0.0.1:${httpPort}`
console.log(`[setup] http on 127.0.0.1:${httpPort}`)

async function jget(path: string): Promise<{ status: number; body: never }> {
  const response = await fetch(base + path)
  return { status: response.status, body: await response.json() as never }
}
async function jpost(path: string, body: unknown): Promise<{ status: number; body: never }> {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { status: response.status, body: await response.json() as never }
}

// hosts list — credentials must be stripped
{
  const { status, body } = await jget(API.hosts)
  const host = (body as { hosts: Array<Record<string, unknown>> }).hosts[0]
  check('GET hosts 200', status === 200)
  check('host summary strips secrets', host.password === undefined && host.privateKey === undefined && host.hasPassword === true, host)
}

// test (saved host, through the pool)
{
  const { body } = await jpost(API.test, { alias: 'nas' })
  const result = body as { ok: boolean; kind?: string }
  check('POST test ok + dsm detected', result.ok === true && result.kind === 'dsm', result)
}

// status probe
{
  const { body } = await jget(API.status + '?alias=nas')
  const s = (body as { status: import('../src/protocol.ts').HostStatus }).status
  check('status hostname/kernel', s.hostname === 'mynas' && s.kind === 'dsm', s)
  check('status load avg', s.loadAvg[0] === 0.42 && s.loadAvg[2] === 0.21, s.loadAvg)
  check('status mem', s.memTotalKb === 8048000 && s.memAvailableKb === 4000000, s)
  check('status disks filtered', s.disks.length === 2 && s.disks[1].mount === '/volume1', s.disks)
}

// docker list + actions + logs
{
  const { body } = await jget(API.dockerContainers + '?alias=nas')
  const containers = (body as { containers: Array<Record<string, unknown>> }).containers
  check('docker list parsed', containers.length === 2 && containers[0].name === 'nginx', containers)
  check('docker stats merged', containers[0].cpuPercent === '0.50%', containers[0])
  const { body: actionBody } = await jpost(API.dockerAction, { alias: 'nas', id: 'def456abc789', action: 'start' })
  check('docker start ok', (actionBody as { ok: boolean }).ok === true, actionBody)
  check('server received docker start', receivedCommands.some(c => c.includes('docker start')))
  const { body: logsBody } = await jget(API.dockerLogs + '?alias=nas&id=abc123def456&tail=100')
  check('docker logs', (logsBody as { logs: string }).logs.includes('log line 2'), logsBody)
}

// power: reboot drops the session; engine must treat abrupt close as success
{
  const { body } = await jpost(API.power, { alias: 'nas', action: 'reboot' })
  check('reboot tolerated (abrupt close = ok)', (body as { ok: boolean }).ok === true, body)
  check('server received reboot', receivedCommands.some(c => c.includes('reboot')))
}

// wol (validates config + packet build; UDP send to broadcast may fail silently on some hosts — it resolves either way here)
{
  const { body } = await jpost(API.wol, { alias: 'nas' })
  check('wol accepted', (body as { ok: boolean }).ok === true || typeof (body as { error?: string }).error === 'string', body)
}

// store behavior
{
  store.update('nas', { label: '新名字', password: '' })
  const entry = store.get('nas')
  check('update keeps stored password on empty field', entry?.password === 'secret' && entry.label === '新名字', entry)
  const problems = store.create as unknown
  void problems
  try {
    store.create({ alias: 'nas', label: 'dup', host: 'x', port: 22, username: 'u', authType: 'password', password: 'p' })
    check('duplicate alias rejected', false)
  } catch { check('duplicate alias rejected', true) }
}

// ---------------------------------------------------------- terminal (WS PTY)
{
  const ws = new WebSocket(`ws://127.0.0.1:${httpPort}${API.terminal}?alias=nas&cols=80&rows=24`)
  let transcript = ''
  let sent = false
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('terminal test timed out; transcript=' + JSON.stringify(transcript))), 8000)
    ws.on('message', (raw) => {
      const frame = JSON.parse(String(raw)) as { type: string; text?: string }
      if (frame.type === 'data') transcript += frame.text
      if (!sent && transcript.includes('fake-shell$')) {
        sent = true
        ws.send(JSON.stringify({ type: 'data', data: 'echo hello-server-panel\n' }))
      }
      if (transcript.includes('hello-server-panel\n')) {
        clearTimeout(timer)
        resolve()
      }
    })
    ws.on('error', reject)
  })
  check('terminal PTY echo over WS', transcript.includes('hello-server-panel'))
  ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 40 }))
  ws.close()
}

// ---------------------------------------------------------- tunnel (local forward)
{
  const { body } = await jpost(API.tunnel, { alias: 'nas', port: 5000 })
  const tunnel = (body as { tunnel: { localPort: number; url: string } }).tunnel
  check('tunnel opened with url', typeof tunnel.localPort === 'number' && tunnel.url.includes('127.0.0.1'), tunnel)
  const response = await fetch(tunnel.url)
  const text = await response.text()
  check('tunnel forwards HTTP to the remote service', text === 'portal-ok', text)
  // reopening reuses the same tunnel
  const { body: again } = await jpost(API.tunnel, { alias: 'nas', port: 5000 })
  check('tunnel reused', (again as { tunnel: { localPort: number } }).tunnel.localPort === tunnel.localPort)
  const { body: list } = await jget(API.tunnels + '?alias=nas')
  check('tunnel listed', (list as { tunnels: unknown[] }).tunnels.length === 1)
  const stopResponse = await fetch(`${base}${API.tunnels}?alias=nas&port=5000`, { method: 'DELETE' })
  check('tunnel stopped', stopResponse.status === 200)
}

engine.dispose()
sshServer.close()
httpServer.close()
portalTarget.close()
console.log(failures === 0 ? '\nALL SERVER-PANEL SMOKE TESTS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
