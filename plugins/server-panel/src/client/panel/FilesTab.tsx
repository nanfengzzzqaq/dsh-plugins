/**
 * Files tab: remote directory browser over SFTP — navigate, download,
 * mkdir, rename, delete (with recursive opt-in for directories).
 */

import { useCallback, useEffect, useState } from 'react'
import type { RemoteFileEntry } from '../../protocol.ts'
import { formatFileSize, tt, type ServerPanelApi } from '../api.ts'

export interface FilesTabProps {
  api: ServerPanelApi
  alias: string
}

function joinPath(base: string, name: string): string {
  return (base.endsWith('/') ? base : base + '/') + name
}

function parentPath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index <= 0 ? '/' : trimmed.slice(0, index)
}

function formatMtime(mtimeSeconds: number): string {
  if (!mtimeSeconds) return '-'
  const date = new Date(mtimeSeconds * 1000)
  return date.toLocaleString()
}

export function FilesTab({ api, alias }: FilesTabProps): React.ReactElement {
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState<RemoteFileEntry[]>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (target: string) => {
    setBusy(true)
    try {
      const list = await api.fileList(alias, target)
      list.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
      setEntries(list.filter(entry => entry.name !== '.' && entry.name !== '..'))
      setError(undefined)
    } catch (listError) {
      setError(tt('files.failed', { error: listError instanceof Error ? listError.message : String(listError) }))
    } finally {
      setBusy(false)
    }
  }, [api, alias])

  useEffect(() => {
    setPath('/')
    setEntries(undefined)
    setError(undefined)
    void refresh('/')
  }, [refresh])

  const navigate = (target: string): void => {
    setPath(target)
    setEntries(undefined)
    void refresh(target)
  }

  const onMkdir = async (): Promise<void> => {
    const name = window.prompt(tt('files.newdir.prompt'))
    if (!name) return
    try {
      await api.fileMkdir(alias, joinPath(path, name.trim()))
      await refresh(path)
    } catch (mkdirError) {
      setError(String(mkdirError instanceof Error ? mkdirError.message : mkdirError))
    }
  }

  const onRename = async (entry: RemoteFileEntry): Promise<void> => {
    const name = window.prompt(tt('files.rename.prompt'), entry.name)
    if (!name || name === entry.name) return
    try {
      await api.fileRename(alias, joinPath(path, entry.name), joinPath(path, name.trim()))
      await refresh(path)
    } catch (renameError) {
      setError(String(renameError instanceof Error ? renameError.message : renameError))
    }
  }

  const onDelete = async (entry: RemoteFileEntry): Promise<void> => {
    if (!window.confirm(tt(entry.isDir ? 'files.delete.confirm.dir' : 'files.delete.confirm', { name: entry.name }))) return
    let recursive = false
    if (entry.isDir) recursive = window.confirm(tt('files.delete.recursive') + '?')
    try {
      await api.fileDelete(alias, joinPath(path, entry.name), entry.isDir, recursive)
      await refresh(path)
    } catch (deleteError) {
      setError(String(deleteError instanceof Error ? deleteError.message : deleteError))
    }
  }

  const onDownload = async (entry: RemoteFileEntry): Promise<void> => {
    try {
      await api.fileDownload(alias, joinPath(path, entry.name))
    } catch (downloadError) {
      setError(String(downloadError instanceof Error ? downloadError.message : downloadError))
    }
  }

  return (
    <>
      <div className="dshsp-toolbar">
        <button className="dshsp-btn" onClick={() => navigate('/')} disabled={busy}>{tt('files.home')}</button>
        <button className="dshsp-btn" onClick={() => navigate(parentPath(path))} disabled={busy || path === '/'}>{tt('files.up')}</button>
        <button className="dshsp-btn" onClick={() => void onMkdir()} disabled={busy}>{tt('files.newdir')}</button>
        <button className="dshsp-btn" onClick={() => navigate(path)} disabled={busy}>{tt('common.refresh')}</button>
      </div>
      <div className="dshsp-pathbar">
        <span className="dshsp-field-label">{tt('files.path')}</span>
        <span className="dshsp-path">{path}</span>
      </div>
      {error && <div className="dshsp-banner" data-kind="error">{error}</div>}
      {entries === undefined ? (
        <div className="dshsp-loading">{tt('files.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="dshsp-empty">{tt('files.empty')}</div>
      ) : (
        <div className="dshsp-tablewrap">
          <table className="dshsp-table">
            <thead>
              <tr>
                <th>{tt('files.name')}</th>
                <th>{tt('files.size')}</th>
                <th>{tt('files.mtime')}</th>
                <th>{tt('files.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.name}>
                  <td>
                    <span
                      className="dshsp-filename"
                      data-dir={entry.isDir ? '' : undefined}
                      onClick={entry.isDir ? () => navigate(joinPath(path, entry.name)) : undefined}
                    >
                      {entry.isDir ? '📁 ' : '📄 '}{entry.name}
                    </span>
                  </td>
                  <td className="dshsp-mono dshsp-muted">{entry.isDir ? '-' : formatFileSize(entry.size)}</td>
                  <td className="dshsp-muted">{formatMtime(entry.mtime)}</td>
                  <td>
                    <div className="dshsp-row-actions">
                      {!entry.isDir && <button className="dshsp-btn" onClick={() => void onDownload(entry)}>{tt('common.download')}</button>}
                      <button className="dshsp-btn" onClick={() => void onRename(entry)}>{tt('common.rename')}</button>
                      <button className="dshsp-btn" data-danger="" onClick={() => void onDelete(entry)}>{tt('common.delete')}</button>
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
