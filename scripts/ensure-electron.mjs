/**
 * Electron 42+ downloads its runtime on demand. electron-vite launches the
 * runtime directly, bypassing the "electron" CLI that would download it.
 * Ensure the official npm package's install.js has provisioned path.txt first.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

export function electronPackageDirectory(resolve = require.resolve) {
  try {
    return path.dirname(resolve('electron/package.json'))
  } catch (error) {
    throw new Error('Electron npm package is missing. Run "pnpm install" first.', { cause: error })
  }
}

export function electronIsReady(directory, platform = process.platform) {
  const executable = platform === 'win32' ? 'electron.exe'
    : platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron'
      : 'electron'
  try {
    const details = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
    const actualPath = fs.readFileSync(path.join(directory, 'path.txt'), 'utf8').trim()
    const binary = path.join(directory, 'dist', actualPath)
    const installedVersion = fs.readFileSync(path.join(directory, 'dist', 'version'), 'utf8').trim().replace(/^v/, '')
    return actualPath === executable && installedVersion === details.version && fs.existsSync(binary)
  } catch {
    return false
  }
}

export function ensureElectron({ directory = electronPackageDirectory(), run = spawnSync, platform = process.platform } = {}) {
  if (electronIsReady(directory, platform)) return

  const installer = path.join(directory, 'install.js')
  if (!fs.existsSync(installer)) {
    throw new Error('Electron install script is missing. Run "pnpm install" first.')
  }

  console.info('[electron] Runtime missing; downloading with Electron official install.js')
  // No shell, no remote script execution, no version mismatch: this installer
  // belongs to the already installed Electron npm package.
  const result = run(process.execPath, [installer], {
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    throw new Error('Electron runtime installation failed: ' +
      (result.error?.message ?? 'exit code ' + result.status) +
      '. Check access to Electron downloads (GitHub Releases) or your mirror/proxy settings.')
  }
  if (!electronIsReady(directory, platform)) {
    throw new Error('Electron install command succeeded but path.txt / runtime is missing or incorrect.')
  }
  console.info('[electron] Runtime ready')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    ensureElectron()
  } catch (error) {
    console.error('[electron] ' + error.message)
    process.exitCode = 1
  }
}
