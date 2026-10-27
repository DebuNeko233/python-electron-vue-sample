/**
 * Windows package managers use .cmd shims. Node.js cannot run those shims
 * directly with spawnSync(shell: false), so launch cmd.exe explicitly.
 *
 * Do not use spawnSync(..., { shell: true }) with an argument array: Node.js
 * deprecates that combination (DEP0190) and it can concatenate unsafe input.
 */
export function resolveProcessCommand(command, args, platform = process.platform) {
  if (platform !== 'win32' || (command !== 'pnpm' && command !== 'npm')) {
    return { command, args }
  }

  // Only internally defined package-manager commands are supported.
  // Never concatenate a user-supplied path or unchecked argument into cmd /c.
  if (!args.every((argument) => /^[a-zA-Z0-9_./:-]+$/.test(argument))) {
    throw new Error('Unsupported package-manager argument for Windows cmd.exe')
  }

  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].join(' ')],
  }
}
