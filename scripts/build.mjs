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
import { resolveProcessCommand } from './lib/process-command.mjs'
import { ensureUv } from './uv-bootstrap.mjs'
import { ensureElectron } from './ensure-electron.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'backend')
const buildRoot = path.join(root, 'build')
const staging = path.join(buildRoot, 'backend-staging')
const finalBackend = path.join(buildRoot, 'backend')
const runtime = path.join(staging, 'runtime')
const pythonVersion = fs.readFileSync(path.join(backend, '.python-version'), 'utf8').trim()
let uv

function run(command, args, options = {}) {
  console.log('[build]', command, ...args)
  const processCommand = resolveProcessCommand(command === 'uv' ? uv : command, args)
  const result = spawnSync(processCommand.command, processCommand.args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  if (result.error || result.status !== 0) {
    throw new Error(command + ' failed: ' + (result.error?.message ?? result.status))
  }
}

/**
 * Locate the Python version uv already installed on this computer.
 * This lookup is offline and ignores the project's disposable .venv.
 */
function findManagedPython() {
  const result = spawnSync(
    uv,
    ['python', 'find', '--managed-python', '--no-project', '--no-python-downloads', pythonVersion],
    { cwd: root, encoding: 'utf8', shell: false },
  )
  if (result.error) throw new Error('uv is required: ' + result.error.message)
  if (result.status !== 0) return null

  const executable = fs.realpathSync(result.stdout.trim())
  if (path.basename(executable).toLowerCase() !== 'python.exe') {
    throw new Error('uv returned an unexpected Python executable: ' + executable)
  }
  return executable
}

/**
 * Install into uv's persistent user-level Python directory only once.
 * Copy the interpreter from there into build/, so installing dependencies
 * for the release cannot modify the cached original.
 */
function preparePythonRuntime() {
  let sourcePython = findManagedPython()
  if (!sourcePython) {
    console.log('[build] Python ' + pythonVersion + ' is not cached; installing it once with uv.')
    run('uv', ['python', 'install', pythonVersion])
    sourcePython = findManagedPython()
  }
  if (!sourcePython) throw new Error('uv could not find Python ' + pythonVersion)

  console.log('[build] Reusing local Python:', sourcePython)
  fs.cpSync(path.dirname(sourcePython), runtime, {
    recursive: true,
    dereference: true,
    force: true,
  })

  const packagedPython = path.join(runtime, 'python.exe')
  if (!fs.existsSync(packagedPython)) {
    throw new Error('The copied Python runtime has no python.exe')
  }
  return packagedPython
}

if (process.platform !== 'win32') {
  throw new Error('The initial release builder targets Windows x64. Build on Windows.')
}

fs.mkdirSync(buildRoot, { recursive: true })
fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })
const env = { ...process.env, UV_LINK_MODE: 'copy' }

try {
  // Electron 42+ no longer downloads itself at pnpm install time.
  ensureElectron()
  uv = await ensureUv()
  // Resolve using pyproject.toml; uv may create an ignored, local uv.lock.
  // Keep the project .venv separate from the self-contained release runtime.
  run('uv', ['sync', '--project', backend])
  const python = preparePythonRuntime()

  const requirements = path.join(staging, 'requirements.txt')
  run('uv', [
    'export', '--project', backend, '--no-dev',
    '--no-emit-project', '--format', 'requirements-txt', '--output-file', requirements,
  ])
  // This interpreter is a fresh, project-owned copy inside build/, never a system Python.
  // uv marks managed CPython externally managed, so explicit permission is required here.
  run('uv', ['pip', 'sync', '--python', python, '--system', '--break-system-packages', requirements], { env })
  run('uv', ['pip', 'install', '--python', python, '--system', '--break-system-packages', '--no-deps', backend], { env })
  run(python, ['-I', '-c', 'import fastapi, uvicorn, loguru, sample_backend; print("Backend import passed")'])

  // The packaged manifest points only to the self-contained release copy.
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
  run(packageManager, ['run', 'typecheck'])
  run(packageManager, [...prefix, 'electron-vite', 'build'])
  run(packageManager, [...prefix, 'electron-builder', '--win', '--dir', '--x64'])
  console.log('Portable Windows directory: dist/win-unpacked')
} catch (error) {
  console.error('[build] Failed:', error)
  process.exitCode = 1
}
