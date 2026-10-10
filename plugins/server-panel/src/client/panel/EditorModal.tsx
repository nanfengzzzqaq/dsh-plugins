/**
 * Remote text file editor: read the file into a modal, edit, save back.
 * Tab inserts two spaces; Ctrl/Cmd+S saves; closing with unsaved changes
 * asks first.
 */

import { useEffect, useRef, useState } from 'react'
import { tt, type ServerPanelApi } from '../api.ts'

export interface EditorModalProps {
  api: ServerPanelApi
  alias: string
  path: string
  onClose: (saved: boolean) => void
}

export function EditorModal({ api, alias, path, onClose }: EditorModalProps): React.ReactElement {
  const [content, setContent] = useState<string>()
  const [original, setOriginal] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    api.fileRead(alias, path)
      .then((result) => {
        if (cancelled) return
        setContent(result.content)
        setOriginal(result.content)
        setTruncated(result.truncated)
      })
      .catch((readError) => { if (!cancelled) setError(String(readError instanceof Error ? readError.message : readError)) })
    return () => { cancelled = true }
  }, [api, alias, path])

  const dirty = content !== undefined && content !== original

  const save = async (): Promise<void> => {
    if (content === undefined || truncated) return
    setSaving(true)
    setError(undefined)
    try {
      await api.fileWrite(alias, path, content)
      setOriginal(content)
      onClose(true)
    } catch (saveError) {
      setError(String(saveError instanceof Error ? saveError.message : saveError))
      setSaving(false)
    }
  }

  const close = (): void => {
    if (dirty && !window.confirm(tt('editor.unsaved'))) return
    onClose(false)
  }

  const name = path.split('/').pop() ?? path

  return (
    <div className="dshsp-modal-backdrop" onClick={close}>
      <div className="dshsp-modal dshsp-modal-lg dshsp-editor" onClick={(e) => e.stopPropagation()}>
        <h3 className="dshsp-modal-title dshsp-mono">{name}</h3>
        <div className="dshsp-hint dshsp-mono" style={{ overflowWrap: 'anywhere' }}>{path}</div>
        {truncated && <div className="dshsp-banner" data-kind="info">{tt('editor.truncated')}</div>}
        {error && <div className="dshsp-banner" data-kind="error">{error}</div>}
        {content === undefined && !error ? (
          <div className="dshsp-loading">{tt('common.loading')}</div>
        ) : (
          <textarea
            ref={areaRef}
            className="dshsp-editor-area"
            value={content}
            readOnly={truncated}
            spellCheck={false}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                void save()
              } else if (e.key === 'Tab') {
                e.preventDefault()
                const area = e.currentTarget
                const { selectionStart, selectionEnd, value } = area
                const next = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd)
                setContent(next)
                requestAnimationFrame(() => {
                  area.selectionStart = area.selectionEnd = selectionStart + 2
                })
              }
            }}
          />
        )}
        <div className="dshsp-modal-footer">
          <span className="dshsp-hint" style={{ marginRight: 'auto' }}>{dirty ? tt('editor.dirty') : ''}</span>
          <button className="dshsp-btn" onClick={close}>{tt('common.cancel')}</button>
          <button className="dshsp-btn" data-primary="" disabled={!dirty || saving || truncated} onClick={() => void save()}>
            {saving ? tt('editor.saving') : tt('editor.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
