/**
 * Files tab: remote directory browser over SFTP — navigate, download,
 * mkdir, rename, delete, drag & drop upload with progress, and a
 * click-to-edit surface for text-like files.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RemoteFileEntry } from '../../protocol.ts'
import { formatFileSize, tt, type ServerPanelApi } from '../api.ts'
import { EditorModal } from './EditorModal.tsx'

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
  return new Date(mtimeSeconds * 1000).toLocaleString()
}

/** Extensions that open in the text editor; others download directly. */
const TEXT_EXT = /\.(txt|md|log|conf|cfg|ini|yaml|yml|json|xml|sh|bash|zsh|env|properties|toml|csv|ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|c|h|cpp|hpp|css|scss|html|htm|sql|vue|svelte|dockerfile|containerfile|gitignore|gitattributes|editorconfig|htaccess|nginx|service|timer|cron|crontab|fstab|hosts|rules|list|sources)$/i
const TEXT_NAMES = /^(docker-compose\.ya?ml|compose\.ya?ml|dockerfile|makefile|justfile|\.env(\..*)?|\.gitignore|\.dockerignore|\.npmrc|\.bashrc|\.zshrc|\.profile|authorized_keys|config)$/i

function isTextLike(entry: RemoteFileEntry): boolean {
  if (entry.isDir) return false
  if (entry.size > 1024 * 1024) return false
  return TEXT_EXT.test(entry.name) || TEXT_NAMES.test(entry.name)
}

interface UploadJob {
  id: number
  name: string
  loaded: number
  total: number
  error?: string
  abort: () => void
}

export function FilesTab({ api, alias }: FilesTabProps): React.ReactElement {
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState<RemoteFileEntry[]>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadJob[]>([])
  const [editing, setEditing] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadSeq = useRef(0)

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
    setUploads([])
    void refresh('/')
  }, [refresh])

  const navigate = (target: string): void => {
    setPath(target)
    setEntries(undefined)
    void refresh(target)
  }

  const startUploads = (files: FileList | File[]): void => {
    for (const file of Array.from(files)) {
      const id = ++uploadSeq.current
      const job: UploadJob = {
        id,
        name: file.name,
        loaded: 0,
        total: file.size,
        abort: () => {},
      }
      const handle = api.fileUpload(alias, path, file, (loaded, total) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, loaded, total } : u))
      })
      job.abort = handle.abort
      setUploads(prev => [...prev, job])
      handle.promise
        .then(() => void refresh(path))
        .catch((uploadError) => {
          setUploads(prev => prev.map(u => u.id === id ? { ...u, error: String(uploadError instanceof Error ? uploadError.message : uploadError) } : u))
        })
        .finally(() => {
          setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 4000)
        })
    }
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

  const onOpen = async (entry: RemoteFileEntry): Promise<void> => {
    if (entry.isDir) return
    if (isTextLike(entry)) {
      setEditing(joinPath(path, entry.name))
      return
    }
    try {
      await api.fileDownload(alias, joinPath(path, entry.name))
    } catch (downloadError) {
      setError(String(downloadError instanceof Error ? downloadError.message : downloadError))
    }
  }

  return (
    <div
      className="dshsp-files-root"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length > 0) startUploads(e.dataTransfer.files)
      }}
    >
      <div className="dshsp-toolbar">
        <button className="dshsp-btn" onClick={() => navigate('/')} disabled={busy}>{tt('files.home')}</button>
        <button className="dshsp-btn" onClick={() => navigate(parentPath(path))} disabled={busy || path === '/'}>{tt('files.up')}</button>
        <button className="dshsp-btn" onClick={() => void onMkdir()} disabled={busy}>{tt('files.newdir')}</button>
        <button className="dshsp-btn" onClick={() => fileInputRef.current?.click()} disabled={busy}>{tt('files.upload')}</button>
        <button className="dshsp-btn" onClick={() => navigate(path)} disabled={busy}>{tt('common.refresh')}</button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) startUploads(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      <div className="dshsp-pathbar">
        <span className="dshsp-field-label">{tt('files.path')}</span>
        <span className="dshsp-path">{path}</span>
        <span className="dshsp-hint">{tt('files.drop.hint')}</span>
      </div>
      {uploads.length > 0 && (
        <div className="dshsp-uploads">
          {uploads.map(job => (
            <div className="dshsp-upload" key={job.id} data-error={job.error ? '' : undefined}>
              <span className="dshsp-upload-name dshsp-mono">{job.name}</span>
              {job.error ? (
                <span className="dshsp-hint" style={{ color: 'var(--dsw-alias-state-error-primary)' }}>{job.error}</span>
              ) : (
                <>
                  <div className="dshsp-meter" style={{ flex: 1 }}>
                    <div className="dshsp-meter-fill" style={{ width: job.total > 0 ? `${(job.loaded / job.total) * 100}%` : '0%' }} />
                  </div>
                  <span className="dshsp-hint">{formatFileSize(job.loaded)} / {formatFileSize(job.total)}</span>
                  <button className="dshsp-iconbtn" onClick={() => job.abort()}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
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
                      data-editable={!entry.isDir && isTextLike(entry) ? '' : undefined}
                      onClick={() => entry.isDir ? navigate(joinPath(path, entry.name)) : void onOpen(entry)}
                    >
                      {entry.isDir ? '📁 ' : isTextLike(entry) ? '📝 ' : '📄 '}{entry.name}
                    </span>
                  </td>
                  <td className="dshsp-mono dshsp-muted">{entry.isDir ? '-' : formatFileSize(entry.size)}</td>
                  <td className="dshsp-muted">{formatMtime(entry.mtime)}</td>
                  <td>
                    <div className="dshsp-row-actions">
                      {!entry.isDir && isTextLike(entry) && <button className="dshsp-btn" onClick={() => setEditing(joinPath(path, entry.name))}>{tt('files.edit')}</button>}
                      {!entry.isDir && <button className="dshsp-btn" onClick={() => void onOpen(entry)}>{tt('common.download')}</button>}
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
      {dragging && <div className="dshsp-drop-overlay">{tt('files.drop.overlay')}</div>}
      {editing && (
        <EditorModal
          api={api}
          alias={alias}
          path={editing}
          onClose={(saved) => {
            setEditing(undefined)
            if (saved) void refresh(path)
          }}
        />
      )}
    </div>
  )
}
