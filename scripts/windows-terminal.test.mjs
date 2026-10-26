import assert from 'node:assert/strict'
import test from 'node:test'
import { windowsTerminalScript } from './windows-terminal.mjs'

test('starts cmd.exe directly instead of interpreting the window title as a file', () => {
  const script = windowsTerminalScript({
    workingDirectory: 'C:\\Users\\Someone\\Desktop\\My Project',
    command: 'pnpm run dev:backend',
    title: 'Python backend',
  })

  assert.ok(script.includes('Start-Process -FilePath $env:ComSpec'))
  assert.ok(script.includes("-ArgumentList '/d /k pnpm run dev:backend'"))
  assert.ok(script.includes("-WorkingDirectory 'C:\\Users\\Someone\\Desktop\\My Project'"))
  assert.ok(script.includes("Write-Output 'Opened Python backend'"))
  assert.ok(!script.includes('start "Python backend"'))
})

test('quotes apostrophes in project paths and supports npm', () => {
  const script = windowsTerminalScript({
    workingDirectory: "C:\\Users\\D'Angelo\\My App",
    command: 'npm run dev:frontend',
    title: 'Electron frontend',
  })

  assert.ok(script.includes("D''Angelo"))
  assert.ok(script.includes('/d /k npm run dev:frontend'))
  assert.ok(script.includes("Write-Output 'Opened Electron frontend'"))
})
