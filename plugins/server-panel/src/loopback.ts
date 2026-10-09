/**
 * Loopback-only trust fence for the /api/dsh-server-panel route family.
 * These endpoints execute commands and move files on remote servers, so a
 * LAN-exposed dsh web deployment must never serve them.
 */

import type { IncomingMessage } from 'node:http'

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'])

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  return LOOPBACK_HOSTS.has(address)
}

/**
 * A request is trusted only when it arrived over the loopback interface AND
 * carries no cross-site browser markers.
 */
export function isLoopbackRequest(req: IncomingMessage): boolean {
  const remote = req.socket.remoteAddress
  if (!isLoopbackAddress(remote)) return false
  const host = req.headers.host
  if (typeof host === 'string' && host !== '') {
    const hostname = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
    if (!LOOPBACK_HOSTS.has(hostname)) return false
  }
  const fetchSite = req.headers['sec-fetch-site']
  if (typeof fetchSite === 'string' && fetchSite === 'cross-site') return false
  return true
}
