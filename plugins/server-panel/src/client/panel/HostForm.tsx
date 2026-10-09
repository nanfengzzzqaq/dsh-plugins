/**
 * Add/edit host dialog. Password / private key fields stay empty on edit —
 * leaving them empty keeps the stored secret (the host half merges).
 */

import { useState } from 'react'
import type { HostPayload, HostPortal, HostSummary, TestResult } from '../../protocol.ts'
import { tt, type ServerPanelApi } from '../api.ts'

export interface HostFormValue extends HostPayload {}

export interface HostFormProps {
  mode: 'add' | 'edit'
  host?: HostSummary
  api: ServerPanelApi
  onCancel: () => void
  onSave: (value: HostFormValue, originalAlias?: string) => Promise<void>
}

export function HostForm({ mode, host, api, onCancel, onSave }: HostFormProps): React.ReactElement {
  const [alias, setAlias] = useState(host?.alias ?? '')
  const [label, setLabel] = useState(host?.label ?? '')
  const [hostname, setHostname] = useState(host?.host ?? '')
  const [port, setPort] = useState(String(host?.port ?? 22))
  const [username, setUsername] = useState(host?.username ?? '')
  const [authType, setAuthType] = useState<'password' | 'key'>(host?.authType ?? 'password')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [group, setGroup] = useState(host?.group ?? '')
  const [wolMac, setWolMac] = useState(host?.wolMac ?? '')
  const [wolBroadcast, setWolBroadcast] = useState(host?.wolBroadcast ?? '')
  const [notes, setNotes] = useState(host?.notes ?? '')
  const [portals, setPortals] = useState<HostPortal[]>(host?.portals ?? [])
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'testing' | { result: TestResult }>('idle')

  const buildPayload = (): HostFormValue => ({
    alias: alias.trim(),
    label: label.trim(),
    host: hostname.trim(),
    port: Number(port) || 22,
    username: username.trim(),
    authType,
    password: password === '' ? undefined : password,
    privateKey: privateKey.trim() === '' ? undefined : privateKey,
    passphrase: passphrase === '' ? undefined : passphrase,
    group: group.trim() || undefined,
    wolMac: wolMac.trim() || undefined,
    wolBroadcast: wolBroadcast.trim() || undefined,
    notes: notes.trim() || undefined,
    portals: portals.filter(p => p.name.trim() !== '' && Number(p.port) > 0),
  })

  const onTest = async (): Promise<void> => {
    setTestState('testing')
    setError(undefined)
    const payload = buildPayload()
    // Editing and credentials left empty: the form cannot test the stored
    // secret itself, so test the saved host when the alias is unchanged.
    const credentialKept = mode === 'edit' && authType === 'password' && password === '' && alias.trim() === host?.alias
    const keyKept = mode === 'edit' && authType === 'key' && privateKey.trim() === '' && alias.trim() === host?.alias
    try {
      const result = (credentialKept || keyKept) && host
        ? await api.testSaved(host.alias)
        : await api.testHost(payload)
      setTestState({ result })
    } catch (testError) {
      setTestState({ result: { ok: false, error: testError instanceof Error ? testError.message : String(testError) } })
    }
  }

  const onSubmit = async (): Promise<void> => {
    setSaving(true)
    setError(undefined)
    try {
      await onSave(buildPayload(), mode === 'edit' ? host?.alias : undefined)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
      setSaving(false)
    }
  }

  return (
    <div className="dshsp-modal-backdrop" onClick={onCancel}>
      <div className="dshsp-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="dshsp-modal-title">{tt(mode === 'add' ? 'host.form.title.add' : 'host.form.title.edit')}</h3>
        <div className="dshsp-formrow">
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.alias')}</span>
            <input className="dshsp-input" value={alias} onChange={e => setAlias(e.target.value)} placeholder="nas" />
          </label>
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.label')}</span>
            <input className="dshsp-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="家里的 NAS" />
          </label>
        </div>
        <div className="dshsp-formrow">
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.host')}</span>
            <input className="dshsp-input" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="192.168.1.10" />
          </label>
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.port')}</span>
            <input className="dshsp-input" value={port} onChange={e => setPort(e.target.value)} inputMode="numeric" />
          </label>
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.username')}</span>
            <input className="dshsp-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
          </label>
        </div>
        <div className="dshsp-field">
          <span className="dshsp-field-label">{tt('host.form.authType')}</span>
          <div className="dshsp-radio-row">
            <label className="dshsp-radio-label">
              <input type="radio" checked={authType === 'password'} onChange={() => setAuthType('password')} />
              {tt('host.form.authType.password')}
            </label>
            <label className="dshsp-radio-label">
              <input type="radio" checked={authType === 'key'} onChange={() => setAuthType('key')} />
              {tt('host.form.authType.key')}
            </label>
          </div>
        </div>
        {authType === 'password' ? (
          <label className="dshsp-field">
            <span className="dshsp-field-label">
              {tt('host.form.password')}{mode === 'edit' && host?.hasPassword ? `（${tt('host.form.password.keep')}）` : ''}
            </span>
            <input className="dshsp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
        ) : (
          <>
            <label className="dshsp-field">
              <span className="dshsp-field-label">
                {tt('host.form.privateKey')}{mode === 'edit' && host?.hasKey ? `（${tt('host.form.privateKey.keep')}）` : ''}
              </span>
              <textarea className="dshsp-input" rows={5} value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
            </label>
            <label className="dshsp-field">
              <span className="dshsp-field-label">{tt('host.form.passphrase')}</span>
              <input className="dshsp-input" type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} />
            </label>
          </>
        )}
        <div className="dshsp-formrow">
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.group')}</span>
            <input className="dshsp-input" value={group} onChange={e => setGroup(e.target.value)} placeholder="NAS" />
          </label>
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.wolMac')}</span>
            <input className="dshsp-input" value={wolMac} onChange={e => setWolMac(e.target.value)} placeholder="01:23:45:67:89:ab" />
          </label>
          <label className="dshsp-field">
            <span className="dshsp-field-label">{tt('host.form.wolBroadcast')}</span>
            <input className="dshsp-input" value={wolBroadcast} onChange={e => setWolBroadcast(e.target.value)} placeholder="255.255.255.255" />
          </label>
        </div>
        <label className="dshsp-field">
          <span className="dshsp-field-label">{tt('host.form.notes')}</span>
          <input className="dshsp-input" value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
        <div className="dshsp-field">
          <span className="dshsp-field-label">{tt('portal.section')}</span>
          {portals.map((portal, index) => (
            <div className="dshsp-formrow" key={index} style={{ gridTemplateColumns: '1.4fr 0.7fr 1fr 1.2fr auto' }}>
              <input className="dshsp-input" placeholder={tt('portal.name')} value={portal.name}
                onChange={e => setPortals(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} />
              <input className="dshsp-input" placeholder={tt('portal.port')} inputMode="numeric" value={String(portal.port || '')}
                onChange={e => setPortals(prev => prev.map((p, i) => i === index ? { ...p, port: Number(e.target.value) || 0 } : p))} />
              <input className="dshsp-input" placeholder={tt('portal.path')} value={portal.path ?? ''}
                onChange={e => setPortals(prev => prev.map((p, i) => i === index ? { ...p, path: e.target.value } : p))} />
              <select className="dshsp-input" value={portal.mode}
                onChange={e => setPortals(prev => prev.map((p, i) => i === index ? { ...p, mode: e.target.value as 'direct' | 'tunnel' } : p))}>
                <option value="direct">{tt('portal.mode.direct')}</option>
                <option value="tunnel">{tt('portal.mode.tunnel')}</option>
              </select>
              <button className="dshsp-btn" data-danger="" onClick={() => setPortals(prev => prev.filter((_, i) => i !== index))}>{tt('portal.remove')}</button>
            </div>
          ))}
          <div>
            <button className="dshsp-btn" onClick={() => setPortals(prev => [...prev, { name: '', port: 0, path: '', mode: 'direct' }])}>
              + {tt('portal.add')}
            </button>
          </div>
        </div>
        {testState !== 'idle' && (
          <div className="dshsp-banner" data-kind={testState === 'testing' ? 'info' : testState.result.ok ? 'ok' : 'error'}>
            {testState === 'testing'
              ? tt('host.form.testing')
              : testState.result.ok
                ? tt('host.form.test.ok', { latency: testState.result.latencyMs ?? 0, banner: testState.result.banner ?? '' })
                : tt('host.form.test.fail', { error: testState.result.error ?? '' })}
          </div>
        )}
        {error && <div className="dshsp-banner" data-kind="error">{error}</div>}
        <div className="dshsp-modal-footer">
          <button className="dshsp-btn" onClick={() => void onTest()} disabled={saving || testState === 'testing'}>{tt('hosts.test')}</button>
          <span style={{ flex: 1 }} />
          <button className="dshsp-btn" onClick={onCancel} disabled={saving}>{tt('host.form.cancel')}</button>
          <button className="dshsp-btn" data-primary="" onClick={() => void onSubmit()} disabled={saving}>{tt('host.form.save')}</button>
        </div>
      </div>
    </div>
  )
}
