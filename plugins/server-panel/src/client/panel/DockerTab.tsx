/**
 * Docker tab: container table with start/stop/restart actions and a log
 * viewer modal that streams `docker logs -f` over the WebSocket upgrade.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DockerContainer } from '../../protocol.ts'
import { tt, type ServerPanelApi } from '../api.ts'

export interface DockerTabProps {
  api: ServerPanelApi
  alias: string
}

export function DockerTab({ api, alias }: DockerTabProps): React.ReactElement {
  const [containers, setContainers] = useState<DockerContainer[]>()
  const [error, setError] = useState<string>()
  const [busyId, setBusyId] = useState<string>()
  const [logsFor, setLogsFor] = useState<DockerContainer>()

  const refresh = useCallback(async () => {
    try {
      setContainers(await api.dockerContainers(alias))
      setError(undefined)
    } catch (dockerError) {
      setError(dockerError instanceof Error ? dockerError.message : String(dockerError))
    }
  }, [api, alias])

  useEffect(() => {
    setContainers(undefined)
    setError(undefined)
    void refresh()
  }, [refresh])

  const action = async (container: DockerContainer, name: 'start' | 'stop' | 'restart'): Promise<void> => {
    if (name === 'stop' && !window.confirm(tt('docker.confirm.stop', { name: container.name }))) return
    if (name === 'restart' && !window.confirm(tt('docker.confirm.restart', { name: container.name }))) return
    setBusyId(container.id)
    try {
      await api.dockerAction(alias, container.id, name)
      await refresh()
    } catch (actionError) {
      setError(tt('docker.action.failed', { error: actionError instanceof Error ? actionError.message : String(actionError) }))
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <>
      <div className="dshsp-toolbar">
        <button className="dshsp-btn" onClick={() => void refresh()}>{tt('docker.refresh')}</button>
      </div>
      {error && <div className="dshsp-banner" data-kind="error">{error}</div>}
      {containers === undefined ? (
        <div className="dshsp-loading">{tt('common.loading')}</div>
      ) : containers.length === 0 ? (
        <div className="dshsp-empty">{tt('docker.empty')}</div>
      ) : (
        <div className="dshsp-tablewrap">
          <table className="dshsp-table">
            <thead>
              <tr>
                <th>{tt('docker.name')}</th>
                <th>{tt('docker.image')}</th>
                <th>{tt('docker.state')}</th>
                <th>{tt('docker.cpu')}</th>
                <th>{tt('docker.mem')}</th>
                <th>{tt('docker.ports')}</th>
                <th>{tt('docker.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {containers.map(container => {
                const running = container.state === 'running'
                const busy = busyId === container.id
                return (
                  <tr key={container.id}>
                    <td className="dshsp-mono">{container.name}</td>
                    <td className="dshsp-mono dshsp-muted">{container.image}</td>
                    <td>
                      <span className="dshsp-badge" data-state={container.state}>{container.state}</span>
                      <div className="dshsp-hint">{container.status}</div>
                    </td>
                    <td className="dshsp-mono">{container.cpuPercent ?? '-'}</td>
                    <td className="dshsp-mono">{container.memUsage?.split('/')[0]?.trim() ?? '-'}</td>
                    <td className="dshsp-mono dshsp-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{container.ports || '-'}</td>
                    <td>
                      <div className="dshsp-row-actions">
                        {running
                          ? <button className="dshsp-btn" disabled={busy} onClick={() => void action(container, 'stop')}>{tt('docker.stop')}</button>
                          : <button className="dshsp-btn" disabled={busy} onClick={() => void action(container, 'start')}>{tt('docker.start')}</button>}
                        <button className="dshsp-btn" disabled={busy} onClick={() => void action(container, 'restart')}>{tt('docker.restart')}</button>
                        <button className="dshsp-btn" onClick={() => setLogsFor(container)}>{tt('docker.logs')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {logsFor && <LogsModal api={api} alias={alias} container={logsFor} onClose={() => setLogsFor(undefined)} />}
    </>
  )
}

/** Log viewer: loads the tail once, then follows over the logs WebSocket. */
function LogsModal({ api, alias, container, onClose }: {
  api: ServerPanelApi
  alias: string
  container: DockerContainer
  onClose: () => void
}): React.ReactElement {
  const [text, setText] = useState(tt('docker.logs.loading'))
  const [following, setFollowing] = useState(false)
  const boxRef = useRef<HTMLPreElement>(null)
  const socketRef = useRef<WebSocket>()

  const scrollToEnd = (): void => {
    const box = boxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }

  useEffect(() => {
    let cancelled = false
    api.dockerLogs(alias, container.id, 300)
      .then((logs) => { if (!cancelled) { setText(logs || '(no logs)'); setTimeout(scrollToEnd, 50) } })
      .catch((error) => { if (!cancelled) setText(String(error instanceof Error ? error.message : error)) })
    return () => { cancelled = true }
  }, [api, alias, container.id])

  useEffect(() => () => {
    socketRef.current?.close()
  }, [])

  const toggleFollow = (): void => {
    if (following) {
      socketRef.current?.close()
      socketRef.current = undefined
      setFollowing(false)
      return
    }
    const url = api.dockerLogsFollowUrl(alias, container.id, 200)
    if (url === undefined) {
      setText(tt('term.unavailable'))
      return
    }
    const socket = new WebSocket(url)
    socketRef.current = socket
    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data)) as { type: string; text?: string }
        if (frame.type === 'data' && typeof frame.text === 'string') {
          setText(prev => {
            const next = prev === tt('docker.logs.loading') ? frame.text! : prev + frame.text!
            // Cap the buffer so long sessions stay responsive.
            return next.length > 400_000 ? next.slice(-300_000) : next
          })
          setTimeout(scrollToEnd, 30)
        }
      } catch { /* ignore malformed frame */ }
    }
    socket.onclose = () => setFollowing(false)
    socket.onerror = () => setFollowing(false)
    setFollowing(true)
  }

  return (
    <div className="dshsp-modal-backdrop" onClick={onClose}>
      <div className="dshsp-modal dshsp-modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="dshsp-modal-title">{tt('docker.logs.title', { name: container.name })}</h3>
        <pre ref={boxRef} className="dshsp-logbox">{text}</pre>
        <div className="dshsp-modal-footer">
          <button className="dshsp-btn" data-primary={following ? undefined : ''} onClick={toggleFollow}>
            {following ? tt('docker.logs.stop') : tt('docker.logs.follow')}
          </button>
          <button className="dshsp-btn" onClick={onClose}>{tt('common.close')}</button>
        </div>
      </div>
    </div>
  )
}
