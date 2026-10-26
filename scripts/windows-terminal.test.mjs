import assert from 'node:assert/strict'
import test from 'node:test'
import { windowsTerminalScript } from './windows-terminal.mjs'

test('launches a real command shell rather than interpreting the title as a file', () => {
  const script = windowsTerminalScript({
    workingDirectory: "C:\\Users\\Someone\\Desktop\\My Project",
    command: 'pnpm run dev:backend',
    title: 'Python backend',
  })

  assert.match(script, /Start-Process -FilePath \$env:ComSpec/)
  assert.match(script, /-ArgumentList '\\/d \\/k pnpm run dev:backend'/)
  assert.match(script, /-WorkingDirectory 'C:\\Users\\Someone\\Desktop\\My Project'/)
  assert.doesNotMatch(script, /start "Python backend"/)
})

test('escapes apostrophes in paths and keeps npm compatibility', () => {
  const script = windowsTerminalScript({
    workingDirectory: "C:\\Users\\D'Angelo\\My App",
    command: 'npm run dev:frontend',
    title: 'Electron frontend',
  })

  assert.match(script, /D''Angelo/)
  assert.match(script, /npm run dev:frontend/)
})
