/**
 * Build a PowerShell command that opens an ordinary, visible cmd.exe window.
 * Single-quote escaping keeps project paths containing spaces or apostrophes safe.
 */

function powerShellLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'"
}

export function windowsTerminalScript({ workingDirectory, command, title }) {
  const directory = powerShellLiteral(workingDirectory)
  const argumentsLine = powerShellLiteral('/d /k ' + command)
  const label = powerShellLiteral(title)

  return [
    "$ErrorActionPreference = 'Stop'",
    "$terminal = Start-Process -FilePath $env:ComSpec",
    '  -ArgumentList ' + argumentsLine,
    '  -WorkingDirectory ' + directory,
    '  -PassThru',
    '  | Out-Null',
    'Write-Output ' + label,
  ].join(' ') + '\n'
}
