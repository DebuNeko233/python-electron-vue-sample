/**
 * Open two visible Windows command-prompt windows for development.
 *
 * Do not invoke cmd's "start" command through another cmd /c: nested quoting
 * makes a window title such as "Python backend" look like an executable path.
 * PowerShell Start-Process launches cmd.exe directly, with the working directory
 * set explicitly. Each child owns its console and prints its normal output.
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { windowsTerminalScript } from './windows-terminal.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

if (process.platform !== 'win32') {
  console.log('On this platform, pnpm dev runs both processes in one terminal.')
  const result = spawnSync(process.execPath, ['scripts/combined.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  process.exit(result.status ?? 1)
}

const packageRunner = (process.env.npm_config_user_agent ?? '').startsWith('pnpm/')
  ? 'pnpm run'
  : 'npm run'

for (const [title, script] of [
  ['Python backend', 'dev:backend'],
  ['Electron frontend', 'dev:frontend'],
]) {
  const powershell = windowsTerminalScript({
    workingDirectory: root,
    command: packageRunner + ' ' + script,
    title,
  })
  const encoded = Buffer.from(powershell, 'utf16le').toString('base64')
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
    { cwd: root, stdio: 'inherit' },
  )

  if (result.error || result.status !== 0) {
    console.error('Failed to open the ' + title + ' terminal.', result.error ?? '')
    process.exit(result.status || 1)
  }
}

console.log('Opened separate terminal windows for Python and Electron.')
