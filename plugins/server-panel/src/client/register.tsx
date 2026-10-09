/**
 * Panel registration: a row in the shell's global sidebar panel list plus the
 * page in the layout's keyed `main` slot, both under one panel id. Both seats
 * are declared by shell plugins, so registration goes through
 * `ctx.slots.inject` — load order does not matter, and a shell without the
 * seats simply never runs the callback.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ServerPanelApi } from './api.ts'
import { tt } from './i18n.ts'
import { App } from './panel/App.tsx'

/** The panel id shared by the sidebar row and the main-slot page. */
export const SERVER_PANEL_ID = 'server-panel'

/** Row order among the shell's global panel rows (Plugins 0, Schedule 10, board 20, skill center 30, SSH 40). */
const PANEL_ORDER = 50

/** The sidebar row glyph; the shell owns the button, label and selection state. */
export function ServerPanelIcon({ size }: { size: number; active: boolean }): React.ReactElement {
  return (
    <svg
      data-dsh-panel-entry={SERVER_PANEL_ID}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="1.75" width="12" height="5.5" rx="1.25" />
      <rect x="2" y="8.75" width="12" height="5.5" rx="1.25" />
      <circle cx="4.25" cy="4.5" r="0.6" fill="currentColor" />
      <circle cx="4.25" cy="11.5" r="0.6" fill="currentColor" />
      <path d="M7 4.5h4.75M7 11.5h3" />
    </svg>
  )
}

interface SlotsFace {
  inject(key: string, callback: () => () => void): () => void
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** Register the sidebar row and the center-column page; returns a disposer. */
export function registerServerPanel(ctx: ClientContext, api: ServerPanelApi): () => void {
  const slots = ctx.slots as unknown as SlotsFace
  const disposers: Array<() => void> = []

  disposers.push(slots.inject('sidebar.panellist', () => slots.register({
    name: 'sidebar.panellist',
    id: SERVER_PANEL_ID,
    order: PANEL_ORDER,
    label: () => tt('entry.label'),
  }, ServerPanelIcon)))

  disposers.push(slots.inject('main', () => slots.register({
    name: 'main',
    key: SERVER_PANEL_ID,
    inject: () => ({ api }),
  }, App as never)))

  return () => {
    for (const dispose of disposers.splice(0)) dispose()
  }
}
