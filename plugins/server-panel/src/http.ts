/** Small HTTP helpers shared by the route family. */

import type { IncomingMessage, ServerResponse } from 'node:http'

/** Cap on JSON request bodies (host payloads are a few KB). */
const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024

/** Read a JSON request body; null on parse failure or overflow. */
export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_JSON_BODY_BYTES) {
        req.destroy()
        resolve(null)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>)
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

export function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(text)
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
