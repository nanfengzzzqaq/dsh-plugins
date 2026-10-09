/**
 * dsh-server-panel — host half. Mounts the host store, the ssh2 engine
 * (connection pool, status probe, docker, SFTP files, power/WOL) and the
 * loopback-only /api/dsh-server-panel route family. The browser half
 * (./client) renders the management panel.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { HostStore } from './store.ts'
import { ServerEngine } from './engine.ts'
import { makeRoutes } from './routes.ts'

/** Stable cordis plugin name. */
export const name = 'server-panel'

/** Services required before the panel surfaces can mount. */
export const inject = ['webServer']

export function apply(ctx: Context): void {
  const store = new HostStore()
  const engine = new ServerEngine(store)
  ctx.effect(() => () => { engine.dispose() }, 'server-panel: engine')

  const { routes, upgrades } = makeRoutes({ store, engine })
  ctx.effect(() => {
    const disposers: Array<() => void> = routes.map(route => ctx.webServer.register(route))
    for (const upgrade of upgrades) disposers.push(ctx.webServer.registerUpgrade(upgrade))
    return () => { for (const dispose of disposers) dispose() }
  }, 'server-panel: routes')

  ctx.logger.info('server-panel 已加载：/api/dsh-server-panel/* 路由就绪')
}
