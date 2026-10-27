/**
 * Verify recovery when Electron is killed without running before-quit.
 * taskkill does NOT use /T here: Python must exit via its own parent watchdog.
 */
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

if (process.platform !== 'win32') throw new Error('Windows-only test')

const executable = path.resolve('dist/win-unpacked/SampleApp.exe')
assert.ok(fs.existsSync(executable), 'SampleApp.exe is missing')

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'sample-parent-exit-'))
const report = path.join(folder, 'backend.json')
const electron = spawn(executable, ['--smoke-parent-exit'], {
  windowsHide: true,
  stdio: 'ignore',
  env: { ...process.env, APP_SMOKE_REPORT: report },
})

function taskkill(pid) {
  return spawnSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore', timeout: 5_000 })
}

function exists(pid) {
  const result = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'if (Get-Process -Id ' + pid + ' -ErrorAction SilentlyContinue) { exit 1 }',
  ], { stdio: 'ignore', timeout: 5_000 })
  return result.status !== 0
}

async function awaitReport() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (electron.exitCode !== null) throw new Error('Electron exited before reporting Python PID')
    if (fs.existsSync(report)) return JSON.parse(fs.readFileSync(report, 'utf8'))
    await pause(150)
  }
  throw new Error('Electron did not report a Python PID')
}

let pythonPid
try {
  const result = await awaitReport()
  pythonPid = result.pythonPid
  assert.ok(Number.isInteger(pythonPid) && pythonPid > 0)
  assert.ok(exists(pythonPid), 'Python was not running before Electron was killed')

  assert.equal(taskkill(electron.pid).status, 0, 'Cannot force-kill Electron')
  const deadline = Date.now() + 20_000
  while (exists(pythonPid) && Date.now() < deadline) {
    await pause(250)
  }
  assert.equal(exists(pythonPid), false, 'Python survived the forced Electron exit')
  console.log('Parent watcher passed: Python exited after Electron was force-killed')
} finally {
  if (electron.exitCode === null && electron.pid) taskkill(electron.pid)
  if (pythonPid && exists(pythonPid)) taskkill(pythonPid)
  fs.rmSync(folder, { force: true, recursive: true })
}
