/**
 * Panel root: host list column on the left, selected-host detail (tabs) on
 * the right. Owns the hosts list state and the add/edit/delete dialog.
 */

import { useCallback, useEffect, useState } from 'react'
import type { HostPortal, HostSummary } from '../../protocol.ts'
import { tt, type ServerPanelApi } from '../api.ts'
import { HostForm, type HostFormValue } from './HostForm.tsx'
import { OverviewTab } from './OverviewTab.tsx'
import { DockerTab } from './DockerTab.tsx'
import { FilesTab } from './FilesTab.tsx'
import { TerminalTab } from './TerminalTab.tsx'

type Tab = 'terminal' | 'overview' | 'docker' | 'files'

type ProbeState = 'unknown' | 'testing' | 'ok' | 'fail'

export interface AppProps {
  api: ServerPanelApi
}

export function App({ api }: AppProps): React.ReactElement {
  const [hosts, setHosts] = useState<HostSummary[]>([])
  const [loadError, setLoadError] = useState<string>()
  const [selectedAlias, setSelectedAlias] = useState<string>()
  const [tab, setTab] = useState<Tab>('terminal')
  const [probes, setProbes] = useState<Record<string, ProbeState>>({})
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; host: HostSummary } | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string }>()

  const reload = useCallback(async (keepSelection = true) => {
    try {
      const list = await api.listHosts()
      setHosts(list)
      setLoadError(undefined)
      setSelectedAlias(prev => {
        if (keepSelection && prev && list.some(h => h.alias === prev)) return prev
        return list[0]?.alias
      })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [api])

  useEffect(() => { void reload() }, [reload])

  const probe = useCallback(async (alias: string) => {
    setProbes(prev => ({ ...prev, [alias]: 'testing' }))
    const result = await api.testSaved(alias).catch(() => undefined)
    setProbes(prev => ({ ...prev, [alias]: result?.ok ? 'ok' : 'fail' }))
  }, [api])

  const selected = hosts.find(h => h.alias === selectedAlias)

  const onDelete = async (host: HostSummary): Promise<void> => {
    if (!window.confirm(tt('hosts.delete.confirm', { label: host.label }))) return
    try {
      await api.deleteHost(host.alias)
      setNotice({ kind: 'ok', text: '✓' })
      await reload(false)
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  const onSave = async (value: HostFormValue, originalAlias?: string): Promise<void> => {
    if (originalAlias) await api.updateHost(originalAlias, value)
    else await api.createHost(value)
    setDialog(null)
    await reload()
  }

  return (
    <div className="dshsp-view" data-dsh-server-panel-view="">
      <div className="dshsp-header">
        <h2 className="dshsp-title">{tt('panel.title')}</h2>
        <button className="dshsp-btn" data-primary="" onClick={() => setDialog({ mode: 'add' })}>{tt('hosts.add')}</button>
        <button className="dshsp-btn" onClick={() => void reload()}>{tt('common.refresh')}</button>
      </div>
      {notice && (
        <div style={{ padding: '0 16px' }}>
          <div className="dshsp-banner" data-kind={notice.kind}>{notice.text}</div>
        </div>
      )}
      {loadError && <div style={{ padding: '0 16px' }}><div className="dshsp-banner" data-kind="error">{tt('common.error', { error: loadError })}</div></div>}
      <div className="dshsp-body">
        <div className="dshsp-hosts">
          {hosts.length === 0 && <div className="dshsp-empty">{tt('hosts.empty')}</div>}
          {hosts.map(host => (
            <button
              key={host.alias}
              className="dshsp-hostcard"
              data-active={host.alias === selectedAlias ? '' : undefined}
              onClick={() => setSelectedAlias(host.alias)}
            >
              <span className="dshsp-hostcard-top">
                <span className="dshsp-dot" data-status={probes[host.alias] ?? 'unknown'} />
                <span className="dshsp-hostname">{host.label}</span>
                {host.detectedKind === 'dsm' && <span className="dshsp-badge" data-kind="dsm">DSM</span>}
              </span>
              <span className="dshsp-hostaddr">{host.username}@{host.host}:{host.port}</span>
              <span className="dshsp-hostmeta">
                {host.group && <span className="dshsp-badge">{host.group}</span>}
                <span className="dshsp-hint">
                  {probes[host.alias] === 'testing' ? tt('status.testing') : probes[host.alias] === 'ok' ? '● online' : probes[host.alias] === 'fail' ? tt('status.offline') : tt('status.unknown')}
                </span>
                <span style={{ flex: 1 }} />
                <span className="dshsp-iconbtn" title={tt('hosts.test')} onClick={(e) => { e.stopPropagation(); void probe(host.alias) }}>⟳</span>
                <span className="dshsp-iconbtn" title={tt('hosts.edit')} onClick={(e) => { e.stopPropagation(); setDialog({ mode: 'edit', host }) }}>✎</span>
                <span className="dshsp-iconbtn" title={tt('hosts.delete')} onClick={(e) => { e.stopPropagation(); void onDelete(host) }}>🗑</span>
              </span>
            </button>
          ))}
        </div>
        <div className="dshsp-detail">
          {selected ? (
            <>
              <DetailHeader api={api} host={selected} onChanged={() => void reload()} />
              <div className="dshsp-tabs">
                {(['terminal', 'docker', 'overview', 'files'] as Tab[]).map(name => (
                  <button key={name} className="dshsp-tab" data-active={tab === name ? '' : undefined} onClick={() => setTab(name)}>
                    {tt(name === 'terminal' ? 'tab.terminal' : name === 'docker' ? 'tab.docker' : name === 'overview' ? 'tab.overview' : 'tab.files')}
                  </button>
                ))}
              </div>
              <div className={tab === 'terminal' ? 'dshsp-tabbody dshsp-tabbody-flush' : 'dshsp-tabbody'}>
                {tab === 'terminal' && <TerminalTab key={selected.alias} api={api} alias={selected.alias} />}
                {tab === 'overview' && <OverviewTab api={api} alias={selected.alias} />}
                {tab === 'docker' && <DockerTab api={api} alias={selected.alias} />}
                {tab === 'files' && <FilesTab api={api} alias={selected.alias} />}
              </div>
            </>
          ) : (
            <div className="dshsp-empty">{tt('hosts.empty')}</div>
          )}
        </div>
      </div>
      {dialog && (
        <HostForm
          mode={dialog.mode}
          host={dialog.mode === 'edit' ? dialog.host : undefined}
          api={api}
          onCancel={() => setDialog(null)}
          onSave={onSave}
        />
      )}
    </div>
  )
}

/** Detail header: host identity + web portal jumps + power actions. */
function DetailHeader({ api, host, onChanged }: { api: ServerPanelApi; host: HostSummary; onChanged: () => void }): React.ReactElement {
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string }>()
  const [busy, setBusy] = useState(false)

  const run = async (action: 'reboot' | 'shutdown' | 'wol'): Promise<void> => {
    if (action === 'reboot' && !window.confirm(tt('power.reboot.confirm', { label: host.label }))) return
    if (action === 'shutdown' && !window.confirm(tt('power.shutdown.confirm', { label: host.label }))) return
    setBusy(true)
    setMessage(undefined)
    try {
      if (action === 'wol') {
        await api.wol(host.alias)
        setMessage({ kind: 'ok', text: tt('power.wol.sent') })
      } else {
        await api.power(host.alias, action)
        setMessage({ kind: 'ok', text: tt('power.sent') })
        onChanged()
      }
    } catch (error) {
      setMessage({ kind: 'error', text: tt('power.failed', { error: error instanceof Error ? error.message : String(error) }) })
    } finally {
      setBusy(false)
    }
  }

  const openPortal = async (portal: HostPortal): Promise<void> => {
    setMessage(undefined)
    const path = portal.path?.startsWith('/') ? portal.path : portal.path ? `/${portal.path}` : ''
    try {
      if (portal.mode === 'tunnel') {
        setMessage({ kind: 'ok', text: tt('portal.tunnel.opening') })
        const tunnel = await api.openTunnel(host.alias, portal.port)
        window.open(`${tunnel.url}${path}`, '_blank', 'noopener')
        setMessage(undefined)
      } else {
        window.open(`http://${host.host}:${portal.port}${path}`, '_blank', 'noopener')
      }
    } catch (error) {
      setMessage({ kind: 'error', text: tt('portal.failed', { error: error instanceof Error ? error.message : String(error) }) })
    }
  }

  return (
    <div className="dshsp-detail-head">
      <span className="dshsp-detail-title">{host.label}</span>
      <span className="dshsp-detail-sub">{host.username}@{host.host}:{host.port}</span>
      {host.detectedKind && <span className="dshsp-badge" data-kind={host.detectedKind}>{tt(host.detectedKind === 'dsm' ? 'overview.kind.dsm' : 'overview.kind.linux')}</span>}
      <span className="dshsp-spacer" />
      {(host.portals ?? []).map((portal, index) => (
        <button
          key={`${portal.name}-${index}`}
          className="dshsp-btn"
          data-portal=""
          title={portal.mode === 'tunnel' ? `SSH tunnel → 127.0.0.1 → :${portal.port}` : `http://${host.host}:${portal.port}`}
          onClick={() => void openPortal(portal)}
        >
          {portal.mode === 'tunnel' ? '⇢ ' : '↗ '}{portal.name}
        </button>
      ))}
      {host.wolMac && <button className="dshsp-btn" disabled={busy} onClick={() => void run('wol')}>{tt('power.wol')}</button>}
      <button className="dshsp-btn" disabled={busy} onClick={() => void run('reboot')}>{tt('power.reboot')}</button>
      <button className="dshsp-btn" data-danger="" disabled={busy} onClick={() => void run('shutdown')}>{tt('power.shutdown')}</button>
      {message && <span className="dshsp-hint" style={{ color: message.kind === 'error' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' }}>{message.text}</span>}
    </div>
  )
}
