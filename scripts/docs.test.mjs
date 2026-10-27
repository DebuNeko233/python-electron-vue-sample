/**
 * Keep handoff documentation usable after files are moved or renamed.
 * Runs with Node.js only; no Markdown dependency or network is required.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const documents = [
  'README.md',
  'AGENTS.md',
  'backend/README.md',
  ...fs.readdirSync(path.join(root, 'docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => 'docs/' + name),
]

for (const relativeFile of documents) {
  test('relative documentation links exist: ' + relativeFile, () => {
    const file = path.join(root, relativeFile)
    const markdown = fs.readFileSync(file, 'utf8')

    // This starter uses simple standard Markdown links in its handoff docs.
    for (const match of markdown.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
      const url = match[1].trim()
      if (/^(?:https?:|mailto:|#)/i.test(url)) continue
      const relativeTarget = decodeURIComponent(url.split('#')[0].split('?')[0])
      if (!relativeTarget) continue

      const target = path.resolve(path.dirname(file), relativeTarget)
      assert.ok(
        fs.existsSync(target),
        relativeFile + ' has a broken link: ' + url,
      )
    }
  })
}
