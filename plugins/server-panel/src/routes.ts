/**
 * The /api/dsh-server-panel route family: host CRUD, connectivity test,
 * status probe, docker management, SFTP file operations, power actions and
 * WOL, plus one WebSocket upgrade that streams `docker logs -f`.
 * Every route is fenced loopback-only (see loopback.ts).
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebSocket as WsSocket } from 'ws'
import { WebSocketServer } from 'ws'
import type { WebRoute, WebUpgradeRoute } from '@deepseek-ai/dsh-host-webserver'
import type { ClientChannel } from 'ssh2'
import { API, type HostEntry, type HostPayload } from './protocol.ts'
import type { HostStore } from './store.ts'
import type { ServerEngine } from './engine.ts'
import { errorMessage, readJsonBody, writeJson } from './http.ts'
import { isLoopbackRequest } from './loopback.ts'

export interface ServerPanelRoutesDeps {
  store: HostStore
  engine: ServerEngine
}

function queryParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)
  return value === null ? undefined : value
}

function requiredParam(url: URL, name: string): string {
  const value = queryParam(url, name)
  if (value === undefined || value === '') throw new Error(`${name} query parameter is required`)
  return value
}

export function makeRoutes(deps: ServerPanelRoutesDeps): { routes: WebRoute[]; upgrades: WebUpgradeRoute[] } {
  const { store, engine } = deps

  /** Shared guard: loopback fence + JSON 403/405. */
  const fence = (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return false
    }
    return true
  }

  const routes: WebRoute[] = [
    // ------------------------------------------------------------ hosts
    {
      kind: 'exact',
      path: API.hosts,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        const method = req.method ?? 'GET'
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          if (method === 'GET') {
            writeJson(res, 200, { hosts: store.list().map(entry => store.summarize(entry)) })
            return
          }
          if (method === 'POST') {
            const body = await readJsonBody(req)
            if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
            const entry = store.create(body as unknown as HostPayload)
            writeJson(res, 201, { host: store.summarize(entry) })
            return
          }
          if (method === 'PATCH' || method === 'DELETE') {
            const alias = requiredParam(url, 'alias')
            if (method === 'DELETE') {
              if (!store.remove(alias)) { writeJson(res, 404, { error: `unknown host alias: ${alias}` }); return }
              engine.invalidate(alias)
              writeJson(res, 200, { ok: true })
              return
            }
            const body = await readJsonBody(req)
            if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
            const entry = store.update(alias, body as Partial<HostPayload>)
            engine.invalidate(entry.alias)
            if (entry.alias !== alias) engine.invalidate(alias)
            writeJson(res, 200, { host: store.summarize(entry) })
            return
          }
          writeJson(res, 405, { error: `method not allowed: ${method}` })
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },

    // ------------------------------------------------------------ test
    {
      kind: 'exact',
      path: API.test,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          // Saved host: test through the pool. Unsaved payload: throwaway
          // connection so the form's test button works before creating.
          if (typeof body.alias === 'string' && body.payload === undefined) {
            writeJson(res, 200, await engine.test(body.alias))
            return
          }
          const payload = body.payload as Partial<HostEntry> | undefined
          if (!payload || typeof payload.host !== 'string' || typeof payload.username !== 'string') {
            writeJson(res, 400, { error: 'payload with host/username is required' })
            return
          }
          const probe: HostEntry = Object.assign(
            { alias: '_probe', label: '_probe', host: '', port: 22, username: '', authType: 'password' as const },
            payload,
          )
          writeJson(res, 200, await engine.testPayload(probe))
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },

    // ------------------------------------------------------------ status
    {
      kind: 'exact',
      path: API.status,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'GET') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          writeJson(res, 200, { status: await engine.status(requiredParam(url, 'alias')) })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },

    // ------------------------------------------------------------ docker
    {
      kind: 'exact',
      path: API.dockerContainers,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'GET') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          writeJson(res, 200, { containers: await engine.dockerList(requiredParam(url, 'alias')) })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.dockerAction,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          const action = String(body.action)
          if (action !== 'start' && action !== 'stop' && action !== 'restart') throw new Error('action must be start|stop|restart')
          await engine.dockerAction(String(body.alias), String(body.id), action)
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.dockerLogs,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'GET') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const tail = Number(queryParam(url, 'tail') ?? '200')
          writeJson(res, 200, { logs: await engine.dockerLogs(requiredParam(url, 'alias'), requiredParam(url, 'id'), tail) })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },

    // ------------------------------------------------------------ power
    {
      kind: 'exact',
      path: API.power,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          const action = String(body.action)
          if (action !== 'reboot' && action !== 'shutdown') throw new Error('action must be reboot|shutdown')
          await engine.power(String(body.alias), action)
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.wol,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          await engine.wol(String(body.alias))
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 400, { error: errorMessage(error) })
        }
      },
    },

    // ------------------------------------------------------------ files
    {
      kind: 'exact',
      path: API.filesList,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'GET') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const entries = await engine.fileList(requiredParam(url, 'alias'), requiredParam(url, 'path'))
          writeJson(res, 200, { entries })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.filesDownload,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'GET') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const remotePath = requiredParam(url, 'path')
          const { stream, size } = await engine.fileDownloadStream(requiredParam(url, 'alias'), remotePath)
          const name = remotePath.replace(/\/+$/, '').split('/').pop() ?? 'download'
          res.writeHead(200, {
            'content-type': 'application/octet-stream',
            'content-length': String(size),
            'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
            'cache-control': 'no-store',
          })
          stream.on('error', () => { try { res.destroy() } catch { /* ignore */ } })
          ;(stream as NodeJS.ReadableStream).pipe(res)
        } catch (error) {
          if (!res.headersSent) writeJson(res, 502, { error: errorMessage(error) })
          else try { res.destroy() } catch { /* ignore */ }
        }
      },
    },
    {
      kind: 'exact',
      path: API.filesMkdir,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          await engine.fileMkdir(String(body.alias), String(body.path))
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.filesRename,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          await engine.fileRename(String(body.alias), String(body.from), String(body.to))
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: API.filesDelete,
      handler: async (req, res) => {
        if (!fence(req, res)) return
        if (req.method !== 'POST') { writeJson(res, 405, { error: 'method not allowed' }); return }
        const body = await readJsonBody(req)
        if (body === null) { writeJson(res, 400, { error: 'invalid JSON body' }); return }
        try {
          await engine.fileDelete(String(body.alias), String(body.path), body.isDir === true, body.recursive === true)
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 502, { error: errorMessage(error) })
        }
      },
    },
  ]

  // ------------------------------------------------- logs follow (WebSocket)
  const logsWss = new WebSocketServer({ noServer: true })
  const upgrades: WebUpgradeRoute[] = [
    {
      path: API.dockerLogsFollow,
      handler: (req, socket, head) => {
        if (!isLoopbackRequest(req)) {
          socket.destroy()
          return
        }
        const url = new URL(req.url ?? '/', 'http://localhost')
        const alias = queryParam(url, 'alias')
        const id = queryParam(url, 'id')
        const tail = Number(queryParam(url, 'tail') ?? '200')
        if (!alias || !id) {
          socket.destroy()
          return
        }
        logsWss.handleUpgrade(req, socket, head, (ws: WsSocket) => {
          let channel: ClientChannel | undefined
          let closed = false
          const shutdown = (): void => {
            if (closed) return
            closed = true
            try { channel?.close() } catch { /* ignore */ }
            try { ws.close() } catch { /* ignore */ }
          }
          engine.dockerLogsChannel(alias, id, tail).then((ch) => {
            if (closed) { try { ch.close() } catch { /* ignore */ } return }
            channel = ch
            const send = (text: string): void => {
              try { ws.send(JSON.stringify({ type: 'data', text })) } catch { /* ignore */ }
            }
            ch.on('data', (data: Buffer) => send(data.toString('utf8')))
            ch.stderr.on('data', (data: Buffer) => send(data.toString('utf8')))
            ch.on('close', () => {
              try { ws.send(JSON.stringify({ type: 'end' })) } catch { /* ignore */ }
              shutdown()
            })
          }, (error) => {
            try { ws.send(JSON.stringify({ type: 'error', message: errorMessage(error) })) } catch { /* ignore */ }
            shutdown()
          })
          ws.on('close', shutdown)
          ws.on('error', shutdown)
        })
      },
    },
  ]

  return { routes, upgrades }
}
