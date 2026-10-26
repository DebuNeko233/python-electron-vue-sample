/**
 * A small wrapper around uv.
 * The developer never needs to activate a virtual environment manually.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'backend')
const environment = path.join(backend, '.venv')
const command = process.argv[2] ?? 'setup'

function run(args, options = {}) {
  const result = spawnSync('uv', args, {
    cwd: backend,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.error) {
    console.error('uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/')
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

switch (command) {
  case 'setup':
    run(['sync'])
    break
  case 'use': {
    const version = process.argv[3]
    if (!version || !/^3\.(10|11|12|13|14|15)(\.\d+)?$/.test(version)) {
      console.error('Usage: pnpm python:use 3.11 (or 3.12.9)')
      process.exit(1)
    }
    // A complete replacement is easier to understand than in-place migration.
    // Do not delete anything except the project's own virtual environment.
    fs.rmSync(environment, { recursive: true, force: true })
    run(['python', 'install', version])
    run(['python', 'pin', version])
    run(['sync'])
    run(['run', 'python', '-c', 'import sys; print("Active Python:", sys.version)'])
    break
  }
  case 'run':
    run(['run', 'python', '-m', 'sample_backend', '--dev'])
    break
  case 'test':
    run(['run', '--group', 'dev', 'pytest', '-q'])
    break
  case 'info':
    run(['run', 'python', '-c', 'import sys; print(sys.executable); print(sys.version)'])
    break
  case 'list':
    run(['python', 'list'])
    break
  default:
    console.error('Unknown python command: ' + command)
    process.exit(1)
}
