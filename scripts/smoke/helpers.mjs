/** Shared smoke-test utilities. A watchdog test must not kill the entire tree. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { setTimeout as pause } from 'node:timers/promises'

export async function waitForJsonFile(filename, { child, timeoutMs, label, details = () => '' }) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(label + ': child exited before reporting. ' + details())
    }
    if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8'))
    await pause(150)
  }
  throw new Error(label + ': timed out. ' + details())
}

export function isWindowsPidAlive(pid) {
  if (process.platform !== 'win32') throw new Error('Windows-only process check')
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid process ID')
  const result = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'if (Get-Process -Id ' + pid + ' -ErrorAction SilentlyContinue) { exit 1 }',
  ], { stdio: 'ignore', timeout: 5_000 })
  return result.status !== 0
}

export function killWindowsPid(pid, { tree = false } = {}) {
  if (process.platform !== 'win32') throw new Error('Windows-only process kill')
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid process ID')
  return spawnSync('taskkill', [
    '/PID', String(pid), ...(tree ? ['/T'] : []), '/F',
  ], { stdio: 'ignore', timeout: 5_000 })
}
