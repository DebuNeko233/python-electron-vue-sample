/** Preload IPC wrappers. Only expose trusted desktop operations. */

export function selectFile(): Promise<string | null> {
  return window.desktop.system.selectFile()
}

export function openLogDirectory(): Promise<void> {
  return window.desktop.system.openLogs()
}
