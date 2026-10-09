/**
 * Module-level translate seat: the client entry wires the locale service's
 * bind() result in at apply time; before that, zh is the fallback.
 * `t(key, { vars })` interpolates {name} style placeholders.
 */

import { zh, type ServerPanelKey } from './locales.ts'

type Translate = (key: ServerPanelKey, vars?: Record<string, string | number>) => string

let runtimeTranslate: ((key: ServerPanelKey) => string) | undefined

export function setRuntimeTranslate(fn: (key: ServerPanelKey) => string): void {
  runtimeTranslate = fn
}

export function tt(key: ServerPanelKey, vars?: Record<string, string | number>): string {
  let text: string
  try {
    text = runtimeTranslate?.(key) ?? zh[key]
  } catch {
    text = zh[key]
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export type { Translate }
