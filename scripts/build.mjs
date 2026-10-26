/**
 * Build a portable Windows folder. The exact uv-managed Python and installed
 * third-party packages live inside the Electron resources folder.
 *
 * This does not copy the development .venv; it constructs a clean runtime.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'backend')
const buildRoot = path.join(root, 'build')
const staging = path.join(buildRoot, 'backend-staging')
const finalBackend = path.join(buildRoot, 'backend')
const runtime = path.join(staging, 'runtime')
const pythonVersion = fs.readFileSync(path.join(backend, '.python-version'), 'utf8').trim()

function run(command, args, options = {}) {
  console.log('[build]', command, ...args)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.error || result.status !== 0) {
    throw new Error(command + ' failed: ' + (result.error?.message ?? result.status))
  }
}

function findPython(directory) {
  // Prefer the installation's root interpreter, not Lib/venv/scripts/nt/python.exe.
  const rootPython = path.join(directory, 'python.exe')
  if (fs.existsSync(rootPython)) return rootPython
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name)
    if (fs.statSync(filename).isDirectory()) {
      const found = findPython(filename)
      if (found) return found
    } else if (name.toLowerCase() === 'python.exe') {
      return filename
    }
  }
  return null
}

if (process.platform !== 'win32') {
  throw new Error('The initial release builder targets Windows x64. Build on Windows.')
}

fs.mkdirSync(buildRoot, { recursive: true })
fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })
const env = { ...process.env, UV_PYTHON_INSTALL_DIR: runtime, UV_LINK_MODE: 'copy' }

try {
  // uv.lock is generated once by uv sync and should be committed with the project.
  run('uv', ['sync', '--project', backend])
  run('uv', ['python', 'install', pythonVersion], { env })
  const python = findPython(runtime)
  if (!python) throw new Error('uv installed Python, but python.exe was not found')

  const requirements = path.join(staging, 'requirements.txt')
  run('uv', [
    'export', '--project', backend, '--locked', '--no-dev',
    '--no-emit-project', '--format', 'requirements-txt', '--output-file', requirements,
  ])
  // This interpreter is a fresh, project-owned copy inside build/, never a system Python.
  // uv marks managed CPython externally managed, so explicit permission is required here.
  run('uv', ['pip', 'sync', '--python', python, '--system', '--break-system-packages', requirements], { env })
  run('uv', ['pip', 'install', '--python', python, '--system', '--break-system-packages', '--no-deps', backend], { env })
  run(python, ['-I', '-c', 'import fastapi, uvicorn, loguru, sample_backend; print("Backend import passed")'])

  const relativePython = path.relative(staging, python).replaceAll('\\', '/')
  fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify({
    python: relativePython,
    python_version: pythonVersion,
    backend_package: 'sample_backend',
  }, null, 2) + '\n')

  fs.rmSync(finalBackend, { recursive: true, force: true })
  fs.renameSync(staging, finalBackend)
  const isPnpm = (process.env.npm_config_user_agent ?? '').startsWith('pnpm/')
  const packageManager = isPnpm ? 'pnpm' : 'npm'
  const prefix = isPnpm ? ['exec'] : ['exec', '--']
  run(packageManager, [...prefix, 'electron-vite', 'build'])
  run(packageManager, [...prefix, 'electron-builder', '--win', '--dir', '--x64'])
  console.log('Portable Windows directory: dist/win-unpacked')
} catch (error) {
  console.error('[build] Failed:', error)
  process.exitCode = 1
}
