/**
 * server-panel build: two bundles, no framework magic.
 *
 *  - lib/index.js  — Host half, ESM, externals stay runtime-resolved
 *    (@deepseek-ai/* come from the profile, ssh2/ws are real dependencies).
 *  - lib/client.js — Browser half. The DSH client module system expects a
 *    `window.__ModuleLoader__.load({ id, factory })` envelope around a CJS
 *    factory whose `require` resolves react / @deepseek-ai/* from the shell's
 *    shared module table. esbuild emits CJS; we wrap it here.
 */
import { build } from 'esbuild'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

const hostExternal = [
  '@deepseek-ai/*',
  'ssh2',
  'ws',
  'node:*',
]

// Bare builtins without the node: prefix must stay external too (ssh2 internals).
const builtins = [
  'assert', 'buffer', 'child_process', 'crypto', 'dgram', 'dns', 'events', 'fs',
  'http', 'https', 'net', 'os', 'path', 'process', 'querystring', 'stream',
  'string_decoder', 'timers', 'tls', 'tty', 'url', 'util', 'zlib', 'constants',
]

await build({
  entryPoints: [path.join(root, 'src/index.ts')],
  outfile: path.join(root, 'lib/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  external: [...hostExternal, ...builtins],
  logLevel: 'info',
})

const clientTmp = path.join(root, 'lib/client.cjs.tmp')
await build({
  entryPoints: [path.join(root, 'src/client/index.tsx')],
  outfile: clientTmp,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  sourcemap: false,
  jsx: 'automatic',
  // .css imports (xterm's stylesheet) arrive as plain text and get injected
  // by the plugin at apply time — no CSS pipeline needed.
  loader: { '.css': 'text' },
  external: ['react', 'react-dom', 'react/jsx-runtime', '@deepseek-ai/*'],
  logLevel: 'info',
})

const bundle = await readFile(clientTmp, 'utf8')
await rm(clientTmp)
const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${bundle}
\t\treturn module.exports;
\t}
});
`
await writeFile(path.join(root, 'lib/client.js'), wrapped)
console.log('built lib/index.js + lib/client.js')
