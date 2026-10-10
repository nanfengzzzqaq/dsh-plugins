/**
 * Loopback-only trust fence for the /api/dsh-server-panel route family.
 * These endpoints execute commands and move files on remote servers, so a
 * LAN-exposed dsh web deployment must never serve them.
 *
 * The socket address (127/8, ::1, IPv4-mapped) is the authoritative gate;
 * X-Forwarded-For is never trusted. `sec-fetch-site: cross-site` is rejected
 * to stop LAN websites from riding a local browser. Origin is deliberately
 * NOT checked: the DSH Desktop shell serves the GUI from dsh-app://app and
 * dials the loopback Host for WebSocket upgrades — a legitimate socket whose
 * Origin cannot match the Host authority.
 */

import type { IncomingMessage } from 'node:http'

/** IPv4 127/8 predicate (four decimal octets, first == 127). */
function isIPv4Loopback(v4: string): boolean {
  const parts = v4.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Whether a socket remote address names the loopback range (127/8, ::1, IPv4-mapped). */
function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice('::ffff:'.length))
  return isIPv4Loopback(normalized)
}

/** Whether a normalized URL hostname names the loopback authority (localhost, [::1], 127/8). */
function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isIPv4Loopback(hostname)
}

/**
 * A request is trusted only when it arrived over the loopback interface with
 * a loopback Host header AND carries no cross-site browser marker.
 */
export function isLoopbackRequest(req: IncomingMessage): boolean {
  if (!isLoopbackAddress(req.socket.remoteAddress)) return false
  const host = req.headers.host
  if (typeof host === 'string' && host !== '') {
    let hostUrl: URL
    try {
      hostUrl = new URL('http://' + host)
    } catch {
      return false
    }
    if (!isLoopbackHostname(hostUrl.hostname)) return false
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  return true
}
