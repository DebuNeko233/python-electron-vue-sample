/** A single-console alternative for developers who prefer merged output. */

import { spawn } from 'node:child_process'

const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(executable, ['run', 'dev:backend'], { stdio: 'inherit' }),
  spawn(executable, ['run', 'dev:frontend'], { stdio: 'inherit' }),
]
let stopping = false

function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

for (const child of children) {
  child.on('error', (error) => { console.error(error); stop() })
  child.on('exit', () => { if (!stopping) stop() })
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
