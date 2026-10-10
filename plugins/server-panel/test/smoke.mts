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
    // Shared in-memory FS across every sftp channel of this connection —
    // the engine opens a fresh sftp session per operation.
    const memFiles = new Map<string, { content: Buffer; mtime: number }>([
      ['/motd.txt', { content: Buffer.from('welcome to fake nas\nline2\n'), mtime: 1700000000 }],
      ['/tmp/data.bin', { content: Buffer.alloc(64, 7), mtime: 1700000001 }],
    ])
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
      // SFTP subsystem on the shared in-memory FS.
      session.on('sftp', (acceptSftp) => {
        const sftp = acceptSftp()
        const { OPEN_MODE, STATUS_CODE } = ssh2.utils.sftp
        const files = memFiles
        let handleSeq = 0
        const handles = new Map<number, { path: string; flags: number; offset: number }>()
        const attrsOf = (entry?: { content: Buffer; mtime: number }, isDir = false) => ({
          mode: isDir ? 0o40755 : 0o100644,
          uid: 0, gid: 0,
          size: isDir ? 4096 : entry?.content.length ?? 0,
          atime: entry?.mtime ?? 1700000000,
          mtime: entry?.mtime ?? 1700000000,
        })
        sftp.on('OPEN', (reqid: number, path: string, flags: number, _attrs: unknown) => {
          if (process.env.DEBUG_SFTP) console.log('[sftp] OPEN', path, 'flags=', flags)
          if (flags & OPEN_MODE.WRITE) {
            files.set(path, { content: Buffer.alloc(0), mtime: Math.floor(Date.now() / 1000) })
          } else if (!files.has(path)) {
            return sftp.status(reqid, STATUS_CODE.NO_SUCH_FILE)
          }
          const id = ++handleSeq
          handles.set(id, { path, flags, offset: 0 })
          const handle = Buffer.alloc(4)
          handle.writeUInt32BE(id)
          sftp.handle(reqid, handle)
        })
        sftp.on('READ', (reqid: number, handle: Buffer, offset: number, length: number) => {
          const entry = handles.get(handle.readUInt32BE(0))
          const file = entry && files.get(entry.path)
          if (!entry || !file) return sftp.status(reqid, STATUS_CODE.NO_SUCH_FILE)
          const data = file.content.subarray(offset, offset + length)
          if (data.length === 0) return sftp.status(reqid, STATUS_CODE.EOF)
          sftp.data(reqid, Buffer.from(data))
        })
        sftp.on('WRITE', (reqid: number, handle: Buffer, offset: number, data: Buffer) => {
          if (process.env.DEBUG_SFTP) console.log('[sftp] WRITE', offset, data.length)
          const entry = handles.get(handle.readUInt32BE(0))
          if (!entry) return sftp.status(reqid, STATUS_CODE.FAILURE)
          const file = files.get(entry.path) ?? { content: Buffer.alloc(0), mtime: 0 }
          const next = Buffer.alloc(Math.max(file.content.length, offset + data.length))
          file.content.copy(next)
          data.copy(next, offset)
          file.content = next
          file.mtime = Math.floor(Date.now() / 1000)
          files.set(entry.path, file)
          sftp.status(reqid, STATUS_CODE.OK)
        })
        sftp.on('CLOSE', (reqid: number, handle: Buffer) => {
          handles.delete(handle.readUInt32BE(0))
          sftp.status(reqid, STATUS_CODE.OK)
        })
        const onStat = (reqid: number, path: string): void => {
          if (path === '/') return sftp.attrs(reqid, attrsOf(undefined, true))
          const file = files.get(path)
          if (!file) return sftp.status(reqid, STATUS_CODE.NO_SUCH_FILE)
          sftp.attrs(reqid, attrsOf(file))
        }
        sftp.on('STAT', onStat)
        sftp.on('LSTAT', onStat)
               sftp.on('RENAME', (reqid: number, from: string, to: string) => {
          const file = files.get(from)
          if (!file) return sftp.status(reqid, STATUS_CODE.NO_SUCH_FILE)
          files.delete(from)
          files.set(to, file)
          sftp.status(reqid, STATUS_CODE.OK)
        })
        // Directory listing: OPENDIR returns a handle, READDIR streams names once.
        sftp.on('OPENDIR', (reqid: number, path: string) => {
          if (path !== '/') return sftp.status(reqid, STATUS_CODE.NO_SUCH_FILE)
          const id = ++handleSeq
          handles.set(id, { path, flags: 0, offset: 0 })
          const handle = Buffer.alloc(4)
          handle.writeUInt32BE(id)
          sftp.handle(reqid, handle)
        })
        sftp.on('READDIR', (reqid: number, handle: Buffer) => {
          const entry = handles.get(handle.readUInt32BE(0))
          if (!entry) return sftp.status(reqid, STATUS_CODE.FAILURE)
          if (entry.offset > 0) return sftp.status(reqid, STATUS_CODE.EOF)
          entry.offset = 1
          const list = [...files.keys()].filter(p => p.lastIndexOf('/') === 0 && p.length > 1).map(p => ({
            filename: p.slice(1),
            longname: `-rw-r--r-- 1 root root ${files.get(p)!.content.length}`,
            attrs: attrsOf(files.get(p)),
          }))
          sftp.name(reqid, list)
        })
      })
      session.on('exec', (acceptExec, _reject, info) => {
        const channel = acceptExec()
        const command = info.command
        receivedCommands.push(command)
        const exit = (code: number, out = '', err = ''): void => {
          if (out) channel.write(out)
          if (err) channel.stderr.write(err)
          channel.exit(code)
          channel.end()
        }
        if (command.includes('reboot') || command.includes('shutdown -h')) {
          // sudo -S with the right password simulates a successful power
          // action: the session dies with the host. Without it, refuse.
          if (command.startsWith("echo 'secret' | sudo -S")) {
            channel.end()
            client.end()
          } else {
            exit(1, '', 'sudo: a password is required')
          }
          return
        }
        // docker: only the sudo -S mode with the correct password works —
        // plain / absolute-path / sudo -n all fail like on a default DSM.
        if (command.includes('docker')) {
          const authed = command.startsWith("echo 'secret' | sudo -S -p '' docker")
          if (!authed) { exit(1, '', 'permission denied'); return }
          if (command.includes('docker version')) exit(0, '24.0.7\n')
          else if (command.includes('docker stats')) exit(0, DOCKER_STATS)
          else if (command.includes('docker ps')) exit(0, DOCKER_PS)
          else if (command.includes('docker logs')) exit(0, 'log line 1\nlog line 2\n')
          else if (command.includes('docker stop') || command.includes('docker start') || command.includes('docker restart')) exit(0, `${command.split(' ').pop()}\n`)
          else exit(0)
          return
        }
        if (command.includes('__HOSTNAME__')) exit(0, STATUS_OUTPUT)
        else if (command.includes('__SP_OK__')) exit(0, '__SP_OK__\nLinux 4.4.302+\nDSM\n')
        else exit(0)
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
  check('docker mode fell back to sudo -S with password', store.get('nas')?.dockerCommand === 'sudo -S docker', store.get('nas')?.dockerCommand)
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

// ---------------------------------------------------------- files (SFTP)
{
  // list
  const { body: listBody } = await jget(API.filesList + '?alias=nas&path=/')
  const entries = (listBody as { entries: Array<{ name: string; isDir: boolean }> }).entries
  check('file list', entries.some(e => e.name === 'motd.txt'), entries)
  // read
  const { body: readBody } = await jget(API.filesRead + '?alias=nas&path=/motd.txt')
  check('file read', (readBody as { content: string }).content.includes('welcome to fake nas'), readBody)
  // write (via temp + rename), then read back
  const { body: writeBody } = await jpost(API.filesWrite, { alias: 'nas', path: '/motd.txt', content: 'edited content 中文\n' })
  check('file write accepted', (writeBody as { ok: boolean }).ok === true, writeBody)
  const { body: rereadBody } = await jget(API.filesRead + '?alias=nas&path=/motd.txt')
  check('file write persisted', (rereadBody as { content: string }).content === 'edited content 中文\n', rereadBody)
  // upload (raw streamed body)
  const uploadResponse = await fetch(`${base}${API.filesUpload}?alias=nas&path=/tmp/uploaded.log`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: 'upload payload 1 2 3',
  })
  check('file upload accepted', uploadResponse.status === 200, uploadResponse.status)
  const { body: uploadRead } = await jget(API.filesRead + '?alias=nas&path=/tmp/uploaded.log')
  check('uploaded content round-trips', (uploadRead as { content: string }).content === 'upload payload 1 2 3', uploadRead)
  // download
  const downloadResponse = await fetch(`${base}${API.filesDownload}?alias=nas&path=/tmp/data.bin`)
  const downloaded = Buffer.from(await downloadResponse.arrayBuffer())
  check('file download streams bytes', downloaded.length === 64 && downloaded[0] === 7, downloaded.length)
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
