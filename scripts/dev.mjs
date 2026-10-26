/** On Windows, open two real terminals instead of hiding the Python output. */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isPnpm = (process.env.npm_config_user_agent ?? '').startsWith('pnpm/')
const command = isPnpm ? 'pnpm' : 'npm run'

if (process.platform !== 'win32') {
  console.log('Two terminal windows are the Windows default. Using combined mode here.')
  const result = spawnSync(process.execPath, ['scripts/combined.mjs'], { cwd: root, stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

for (const [title, script] of [['Python backend', 'dev:backend'], ['Electron frontend', 'dev:frontend']]) {
  const line = 'start "' + title + '" cmd.exe /k "' + command + ' ' + script + '"'
  const result = spawnSync('cmd.exe', ['/d', '/c', line], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) {
    console.error('Failed to open terminal: ' + title)
    process.exit(result.status ?? 1)
  }
}
console.log('Python and Electron started in separate terminal windows.')
