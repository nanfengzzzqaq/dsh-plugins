/**
 * Browser-half entry for dsh-server-panel — runs inside the dsh web GUI.
 * Registers the locale dictionaries, injects the panel stylesheet, and mounts
 * the sidebar row + center-column page. Failure policy: mounting problems are
 * logged, never thrown — an external plugin must not take the GUI boot down.
 *
 * Export discipline: the /client surface carries the cordis plugin contract
 * (inject / apply) only; all value exports stay internal.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only merges: ctx.locale / ctx.slots / ctx.layout.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { ServerPanelApi } from './api.ts'
import { en, zh, type ServerPanelKey } from './locales.ts'
import { setRuntimeTranslate } from './i18n.ts'
import { installStyles } from './styles.ts'
import { registerServerPanel } from './register.tsx'

/** Locale namespace this plugin owns. */
const NS = 'dsh-server-panel'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** server-panel surface copy. */
    'dsh-server-panel': ServerPanelKey
  }
}

/** Required client services (fiber inject waiting). */
export const inject = ['slots', 'locale', 'layout']

interface LocaleService {
  register(ns: string, dicts: { zh: unknown; en: unknown }): () => void
  bind(ns: string): (key: ServerPanelKey) => string
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    try {
      return (ctx.locale as unknown as LocaleService).register(NS, { zh, en })
    } catch {
      return () => {}
    }
  }, 'server-panel: dictionaries')

  try { setRuntimeTranslate((ctx.locale as unknown as LocaleService).bind(NS)) } catch { /* zh fallback stays */ }

  const disposers: Array<() => void> = []
  try {
    disposers.push(installStyles())
    disposers.push(registerServerPanel(ctx, new ServerPanelApi()))
  } catch (error) {
    console.warn('[dsh-server-panel] panel registration failed:', error)
  }
  ctx.effect(() => () => {
    for (const dispose of disposers.splice(0)) dispose()
  }, 'server-panel: ui mounts')
}
