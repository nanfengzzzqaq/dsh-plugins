/**
 * Dashboard: the panel's home view — one live status card per host.
 * Polls /status for every host on an interval, keeps a short client-side
 * history, and renders CPU/memory sparklines plus disk bars. Cards with a
 * hot metric (cpu/mem/disk ≥ 90%) turn red; offline hosts dim.
 */

import { useEffect, useMemo, useState } from 'react'
import type { HostStatus, HostSummary } from '../../protocol.ts'
import { formatBytes, formatUptime, tt, type ServerPanelApi } from '../api.ts'

export interface DashboardProps {
  api: ServerPanelApi
  hosts: HostSummary[]
  onOpenHost: (alias: string) => void
}

interface Sample {
  cpu: number
  mem: number
}

interface HostLive {
  status?: HostStatus
  error?: string
  history: Sample[]
}

const POLL_MS = 8000
const HISTORY = 45

function memPercent(status: HostStatus): number {
  if (status.memTotalKb <= 0) return 0
  return Math.round(((status.memTotalKb - status.memAvailableKb) / status.memTotalKb) * 100)
}

function cpuPercent(status: HostStatus): number {
  if (status.cpuPercent !== undefined) return status.cpuPercent
  // First sample fallback: normalize the 1-min load by core count.
  if (status.cpuCount > 0) return Math.min(100, Math.round((status.loadAvg[0] / status.cpuCount) * 100))
  return 0
}

function worstDisk(status: HostStatus): number {
  return status.disks.reduce((max, disk) => Math.max(max, disk.usePercent), 0)
}

/** Tiny inline sparkline (SVG polyline, 100x24 viewBox). */
export function Sparkline({ points, hot }: { points: number[]; hot?: boolean }): React.ReactElement {
  const width = 100
  const height = 24
  if (points.length < 2) return <svg className="dshsp-spark" viewBox={`0 0 ${width} ${height}`} />
  const path = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width
    const y = height - (Math.max(0, Math.min(100, value)) / 100) * (height - 2) - 1
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="dshsp-spark" viewBox={`0 0 ${width} ${height}`} data-hot={hot ? '' : undefined} preserveAspectRatio="none">
      <path d={path} fill="none" strokeWidth="1.5" />
    </svg>
  )
}

export function Meter({ percent, label }: { percent: number; label: string }): React.ReactElement {
  return (
    <div className="dshsp-meter-row">
      <span className="dshsp-meter-label">{label}</span>
      <div className="dshsp-meter">
        <div className="dshsp-meter-fill" data-hot={percent >= 90 ? '' : percent >= 70 ? 'warm' : undefined} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className="dshsp-meter-value">{Math.round(percent)}%</span>
    </div>
  )
}

export function Dashboard({ api, hosts, onOpenHost }: DashboardProps): React.ReactElement {
  const [live, setLive] = useState<Record<string, HostLive>>({})
  const aliasesKey = useMemo(() => hosts.map(h => h.alias).join(','), [hosts])

  useEffect(() => {
    const aliases = aliasesKey === '' ? [] : aliasesKey.split(',')
    let cancelled = false
    const tick = async (): Promise<void> => {
      await Promise.all(aliases.map(async (alias) => {
        try {
          const status = await api.status(alias)
          if (cancelled) return
          setLive(prev => {
            const entry = prev[alias] ?? { history: [] }
            const sample: Sample = { cpu: cpuPercent(status), mem: memPercent(status) }
            return {
              ...prev,
              [alias]: { status, history: [...entry.history, sample].slice(-HISTORY) },
            }
          })
        } catch (error) {
          if (cancelled) return
          setLive(prev => ({
            ...prev,
            [alias]: { history: prev[alias]?.history ?? [], error: error instanceof Error ? error.message : String(error) },
          }))
        }
      }))
    }
    void tick()
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [api, aliasesKey])

  return (
    <div className="dshsp-dash">
      {hosts.map(host => {
        const entry = live[host.alias]
        const status = entry?.status
        const offline = entry?.error !== undefined
        const cpu = status ? cpuPercent(status) : 0
        const mem = status ? memPercent(status) : 0
        const disk = status ? worstDisk(status) : 0
        const hot = cpu >= 90 || mem >= 90 || disk >= 90
        return (
          <button key={host.alias} className="dshsp-dashcard" data-hot={hot && !offline ? '' : undefined} data-offline={offline ? '' : undefined} onClick={() => onOpenHost(host.alias)}>
            <div className="dshsp-dashcard-head">
              <span className="dshsp-dot" data-status={offline ? 'fail' : status ? 'ok' : 'testing'} />
              <span className="dshsp-dashcard-name">{host.label}</span>
              {host.detectedKind && <span className="dshsp-badge" data-kind={host.detectedKind}>{tt(host.detectedKind === 'dsm' ? 'overview.kind.dsm' : 'overview.kind.linux')}</span>}
            </div>
            <div className="dshsp-dashcard-addr dshsp-mono">{host.username}@{host.host}:{host.port}</div>
            {offline ? (
              <div className="dshsp-dashcard-offline">
                <span>{tt('status.offline')}</span>
                <span className="dshsp-hint">{entry?.error?.slice(0, 80)}</span>
              </div>
            ) : status ? (
              <>
                <div className="dshsp-dashcard-gauges">
                  <div className="dshsp-gauge">
                    <Meter percent={cpu} label="CPU" />
                    <Sparkline points={(entry?.history ?? []).map(s => s.cpu)} hot={cpu >= 90} />
                  </div>
                  <div className="dshsp-gauge">
                    <Meter percent={mem} label="MEM" />
                    <Sparkline points={(entry?.history ?? []).map(s => s.mem)} hot={mem >= 90} />
                  </div>
                </div>
                <div className="dshsp-dashcard-meta">
                  <span>{formatUptime(status.uptimeSeconds)}</span>
                  <span className="dshsp-mono">load {status.loadAvg.map(v => v.toFixed(2)).join(' ')}</span>
                </div>
                <div className="dshsp-dashcard-disks">
                  {status.disks.slice(0, 3).map(disk => (
                    <div className="dshsp-meter-row" key={disk.mount}>
                      <span className="dshsp-meter-label dshsp-mono">{disk.mount}</span>
                      <div className="dshsp-meter">
                        <div className="dshsp-meter-fill" data-hot={disk.usePercent >= 90 ? '' : undefined} style={{ width: `${Math.min(disk.usePercent, 100)}%` }} />
                      </div>
                      <span className="dshsp-meter-value">{formatBytes(disk.availKb)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="dshsp-loading">{tt('common.loading')}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
