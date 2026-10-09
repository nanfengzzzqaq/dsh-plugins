/**
 * Overview tab: one status probe on mount + manual refresh + 15s auto
 * refresh while mounted.
 */

import { useCallback, useEffect, useState } from 'react'
import type { HostStatus } from '../../protocol.ts'
import { formatBytes, formatUptime, tt, type ServerPanelApi } from '../api.ts'

export interface OverviewTabProps {
  api: ServerPanelApi
  alias: string
}

export function OverviewTab({ api, alias }: OverviewTabProps): React.ReactElement {
  const [status, setStatus] = useState<HostStatus>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.status(alias))
      setError(undefined)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError))
    } finally {
      setLoading(false)
    }
  }, [api, alias])

  useEffect(() => {
    setLoading(true)
    setStatus(undefined)
    setError(undefined)
    void refresh()
    const timer = setInterval(() => void refresh(), 15_000)
    return () => clearInterval(timer)
  }, [refresh])

  if (loading) return <div className="dshsp-loading">{tt('common.loading')}</div>
  if (error) {
    return (
      <>
        <div className="dshsp-toolbar"><button className="dshsp-btn" onClick={() => void refresh()}>{tt('common.refresh')}</button></div>
        <div className="dshsp-banner" data-kind="error">{tt('common.error', { error })}</div>
      </>
    )
  }
  if (!status) return <div className="dshsp-empty" />

  const memUsed = status.memTotalKb - status.memAvailableKb
  const memPercent = status.memTotalKb > 0 ? Math.round((memUsed / status.memTotalKb) * 100) : 0

  return (
    <>
      <div className="dshsp-toolbar">
        <button className="dshsp-btn" onClick={() => void refresh()}>{tt('common.refresh')}</button>
      </div>
      <dl className="dshsp-kv">
        <dt>{tt('overview.hostname')}</dt><dd className="dshsp-mono">{status.hostname || '-'}</dd>
        <dt>{tt('overview.kind')}</dt>
        <dd><span className="dshsp-badge" data-kind={status.kind}>{tt(status.kind === 'dsm' ? 'overview.kind.dsm' : 'overview.kind.linux')}</span></dd>
        <dt>{tt('overview.kernel')}</dt><dd className="dshsp-mono">{status.kernel || '-'}</dd>
        <dt>{tt('overview.uptime')}</dt><dd>{formatUptime(status.uptimeSeconds)}</dd>
        <dt>{tt('overview.cpu')}</dt><dd>{status.cpuCount || '-'}</dd>
        <dt>{tt('overview.load')}</dt>
        <dd className="dshsp-mono">{status.loadAvg.map(v => v.toFixed(2)).join('  ')}</dd>
        <dt>{tt('overview.mem')}</dt>
        <dd>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="dshsp-meter" style={{ flex: '0 140px' }}>
              <div className="dshsp-meter-fill" data-hot={memPercent >= 90 ? '' : undefined} style={{ width: `${memPercent}%` }} />
            </div>
            <span>{tt('overview.mem.format', { used: formatBytes(memUsed), total: formatBytes(status.memTotalKb), percent: memPercent })}</span>
          </div>
        </dd>
      </dl>
      <div className="dshsp-field-label">{tt('overview.disks')}</div>
      {status.disks.length === 0 ? (
        <div className="dshsp-empty">{tt('overview.disks.empty')}</div>
      ) : (
        <div className="dshsp-tablewrap" style={{ flex: 'none' }}>
          <table className="dshsp-table">
            <thead>
              <tr><th>{tt('files.path')}</th><th>{tt('files.size')}</th><th>%</th><th /></tr>
            </thead>
            <tbody>
              {status.disks.map(disk => (
                <tr key={disk.mount}>
                  <td className="dshsp-mono">{disk.mount}</td>
                  <td>{formatBytes(disk.usedKb)} / {formatBytes(disk.totalKb)}</td>
                  <td className="dshsp-mono">{disk.usePercent}%</td>
                  <td style={{ width: 140 }}>
                    <div className="dshsp-meter">
                      <div className="dshsp-meter-fill" data-hot={disk.usePercent >= 90 ? '' : undefined} style={{ width: `${Math.min(disk.usePercent, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
