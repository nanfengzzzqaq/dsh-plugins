/**
 * Terminal tab: a full xterm.js session over the terminal WebSocket —
 * an interactive PTY shell on the selected host. Connects on mount,
 * disconnects on unmount; a reconnect button appears after exit.
 */

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import xtermCss from '@xterm/xterm/css/xterm.css'
import { tt, type ServerPanelApi } from '../api.ts'

let xtermCssInstalled = false
function installXtermCss(): void {
  if (xtermCssInstalled || typeof document === 'undefined') return
  xtermCssInstalled = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-server-panel-xterm'
  tag.textContent = xtermCss
  document.head.appendChild(tag)
}

export interface TerminalTabProps {
  api: ServerPanelApi
  alias: string
}

type SessionState = 'connecting' | 'live' | 'closed'

export function TerminalTab({ api, alias }: TerminalTabProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>()
  const socketRef = useRef<WebSocket>()
  const [state, setState] = useState<SessionState>('connecting')
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    installXtermCss()
    const container = containerRef.current
    if (!container) return

    setState('connecting')
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: { background: '#0b0e14' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(container)
    fit.fit()
    termRef.current = term

    const socket = new WebSocket(api.terminalUrl(alias, term.cols, term.rows))
    socketRef.current = socket

    socket.onopen = () => setState('live')
    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data)) as { type: string; text?: string; message?: string }
        if (frame.type === 'data' && typeof frame.text === 'string') term.write(frame.text)
        else if (frame.type === 'exit') {
          term.writeln(`\r\n\x1b[33m[${frame.message ?? 'session closed'}]\x1b[0m`)
          setState('closed')
        }
      } catch { /* ignore malformed frame */ }
    }
    socket.onclose = () => setState('closed')
    socket.onerror = () => setState('closed')

    const inputSub = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'data', data }))
    })
    const resizeObserver = new ResizeObserver(() => {
      try {
        fit.fit()
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
        }
      } catch { /* fit during unmount */ }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      inputSub.dispose()
      socket.close()
      term.dispose()
      termRef.current = undefined
      socketRef.current = undefined
    }
  }, [api, alias, epoch])

  return (
    <div className="dshsp-term-wrap">
      <div className="dshsp-term" ref={containerRef} />
      {state !== 'live' && (
        <div className="dshsp-term-overlay">
          <span>{state === 'connecting' ? tt('common.loading') : tt('term.closed')}</span>
          {state === 'closed' && (
            <button className="dshsp-btn" data-primary="" onClick={() => setEpoch(e => e + 1)}>{tt('term.reconnect')}</button>
          )}
        </div>
      )}
    </div>
  )
}
