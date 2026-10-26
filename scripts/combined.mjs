/** Start two independent development services in a single console. */

import { spawn, spawnSync } from 'node:child_process'

const children = []
let closing = false

function start(script) {
  // .cmd files are not directly executable through spawn() on Windows.
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/c', 'npm run ' + script], { stdio: 'inherit' })
    : spawn('npm', ['run', script], { stdio: 'inherit' })
  child.on('error', (error) => {
    console.error('Failed to launch ' + script + ':', error)
    stop()
  })
  child.on('exit', () => {
    if (!closing) stop()
  })
  children.push(child)
}

function stop() {
  if (closing) return
  closing = true
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  }
}

process.once('SIGINT', stop)
process.once('SIGTERM', stop)
start('dev:backend')
start('dev:frontend')
