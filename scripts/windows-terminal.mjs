/**
 * Build a PowerShell command that opens an ordinary, visible cmd.exe window.
 * Quoting the working directory in PowerShell avoids cmd's nested "start" syntax.
 */

function powerShellLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'"
}

export function windowsTerminalScript({ workingDirectory, command, title }) {
  const directory = powerShellLiteral(workingDirectory)
  const argumentsLine = powerShellLiteral('/d /k ' + command)

  return [
    "$ErrorActionPreference = 'Stop'",
    '$terminal = Start-Process -FilePath $env:ComSpec -ArgumentList ' +
      argumentsLine + ' -WorkingDirectory ' + directory + ' -PassThru',
    "if (-not $terminal -or -not $terminal.Id) { throw 'Could not open terminal' }",
    'Write-Output ' + powerShellLiteral('Opened ' + title),
  ].join('\n') + '\n'
}
