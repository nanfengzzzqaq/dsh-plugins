/**
 * Panel styles, injected as a single <style> tag while the plugin is active.
 * Colors come from the dsh design tokens (--dsw-*) so the panel follows the
 * active theme (light/dark).
 */

export const PANEL_CSS = `
.dshsp-view { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family); }
.dshsp-header { flex: none; display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; }
.dshsp-title { flex: 1; margin: 0; font-size: 16px; font-weight: 700; white-space: nowrap; }
.dshsp-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.dshsp-hosts { flex: none; width: 240px; border-right: 1px solid var(--dsw-alias-border-l1);
  display: flex; flex-direction: column; overflow-y: auto; padding: 10px; gap: 8px; }
.dshsp-hostcard { text-align: left; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: pointer;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; font: inherit; width: 100%; }
.dshsp-hostcard:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-hostcard[data-active] { border-color: var(--dsw-alias-state-business-primary); }
.dshsp-hostcard-top { display: flex; align-items: center; gap: 8px; }
.dshsp-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-tertiary); }
.dshsp-dot[data-status=ok] { background: var(--dsw-alias-state-success-primary); }
.dshsp-dot[data-status=fail] { background: var(--dsw-alias-state-error-primary); }
.dshsp-dot[data-status=testing] { background: var(--dsw-alias-state-warn-primary); }
.dshsp-hostname { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.dshsp-hostaddr { color: var(--dsw-alias-label-tertiary); font-size: 11.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-hostmeta { display: flex; gap: 6px; align-items: center; }
.dshsp-detail { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.dshsp-detail-head { flex: none; display: flex; align-items: center; gap: 10px; padding: 12px 16px 0; flex-wrap: wrap; }
.dshsp-detail-title { font-size: 14px; font-weight: 700; }
.dshsp-detail-sub { color: var(--dsw-alias-label-tertiary); font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-spacer { flex: 1; }
.dshsp-tabs { flex: none; display: flex; gap: 2px; padding: 8px 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dshsp-tab { border: none; border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0; background: none;
  color: var(--dsw-alias-label-secondary); cursor: pointer; padding: 7px 14px; font-size: 13px; font-family: inherit; }
.dshsp-tab:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-tab[data-active] { color: var(--dsw-alias-label-primary); font-weight: 600;
  border-bottom-color: var(--dsw-alias-state-business-primary); }
.dshsp-tabbody { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 16px;
  display: flex; flex-direction: column; gap: 10px; }
.dshsp-toolbar { flex: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshsp-btn { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: none; cursor: pointer;
  color: var(--dsw-alias-label-primary); padding: 5px 12px; font-size: 12px; font-family: inherit; white-space: nowrap; }
.dshsp-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-btn:disabled { opacity: .45; cursor: default; }
.dshsp-btn[data-primary] { background: var(--dsw-alias-button-info-fill); color: var(--dsw-alias-label-primary-foreground);
  border: none; font-weight: 600; padding: 6px 14px; font-size: 13px; }
.dshsp-btn[data-primary]:hover:not(:disabled) { background: var(--dsw-alias-button-info-hover); }
.dshsp-btn[data-danger] { color: var(--dsw-alias-state-error-primary); }
.dshsp-iconbtn { width: 26px; height: 26px; border: none; border-radius: 6px; background: none; cursor: pointer;
  color: var(--dsw-alias-label-secondary); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
.dshsp-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshsp-tablewrap { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; overflow: auto; flex: 1; min-height: 0; }
.dshsp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dshsp-table th { position: sticky; top: 0; z-index: 1; text-align: left; padding: 8px 10px; font-weight: 600;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-l1); white-space: nowrap; }
.dshsp-table td { padding: 7px 10px; border-bottom: 1px solid var(--dsw-alias-separator-primary); vertical-align: middle; }
.dshsp-table tbody tr:last-child td { border-bottom: none; }
.dshsp-table tbody tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshsp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshsp-muted { color: var(--dsw-alias-label-tertiary); }
.dshsp-badge { display: inline-block; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
  padding: 1px 8px; font-size: 11px; line-height: 1.6; white-space: nowrap; color: var(--dsw-alias-label-secondary); }
.dshsp-badge[data-kind=dsm] { color: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }
.dshsp-badge[data-state=running] { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.dshsp-badge[data-state=exited] { color: var(--dsw-alias-label-tertiary); }
.dshsp-empty, .dshsp-loading { text-align: center; color: var(--dsw-alias-label-tertiary); padding: 28px 12px; font-size: 12.5px; }
.dshsp-banner { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 8px 12px;
  font-size: 12.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshsp-banner[data-kind=ok] { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.dshsp-banner[data-kind=error] { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dshsp-kv { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 12.5px; }
.dshsp-kv dt { color: var(--dsw-alias-label-secondary); } .dshsp-kv dd { margin: 0; }
.dshsp-meter { height: 6px; border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover); overflow: hidden; min-width: 90px; }
.dshsp-meter-fill { height: 100%; border-radius: 999px; background: var(--dsw-alias-state-business-primary); }
.dshsp-meter-fill[data-hot] { background: var(--dsw-alias-state-error-primary); }
.dshsp-modal-backdrop { position: fixed; inset: 0; z-index: 40; background: var(--dsw-alias-bg-mask-1);
  display: flex; align-items: center; justify-content: center; }
.dshsp-modal { background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px;
  box-shadow: var(--dsw-shadow-lv3); color: var(--dsw-alias-label-primary); width: min(620px, calc(100vw - 48px));
  max-height: calc(100vh - 96px); overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.dshsp-modal-lg { width: min(860px, calc(100vw - 48px)); }
.dshsp-modal-title { margin: 0; font-size: 15px; font-weight: 700; }
.dshsp-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.dshsp-field { display: flex; flex-direction: column; gap: 5px; }
.dshsp-field-label { color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }
.dshsp-input { color: var(--dsw-alias-label-primary); background: var(--dsw-specific-input-major);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; outline: none; padding: 7px 10px;
  font-family: inherit; font-size: 13px; resize: vertical; }
.dshsp-input:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshsp-formrow { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px 12px; }
.dshsp-radio-row { display: flex; align-items: center; gap: 16px; }
.dshsp-radio-label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; }
.dshsp-logbox { background: #0b0e14; color: #d3e1f5; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.55;
  padding: 10px 12px; white-space: pre-wrap; word-break: break-all; overflow-y: auto; flex: 1; min-height: 220px; max-height: 55vh; }
.dshsp-pathbar { display: flex; align-items: center; gap: 8px; }
.dshsp-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px;
  color: var(--dsw-alias-label-secondary); }
.dshsp-filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsp-filename[data-dir] { color: var(--dsw-alias-state-business-primary); cursor: pointer; font-weight: 500; }
.dshsp-row-actions { display: flex; gap: 6px; white-space: nowrap; }
.dshsp-hint { color: var(--dsw-alias-label-tertiary); font-size: 11.5px; }
`

/** Inject the stylesheet once; returns a disposer removing it. */
export function installStyles(): () => void {
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-server-panel'
  tag.textContent = PANEL_CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}
