/** Types shared by the renderer and the secure preload bridge. */

export interface BackendEvent {
  event: string
  sequence: number
  data: Record<string, unknown>
}

export type BackendStatus = 'starting' | 'ready' | 'offline' | 'stopping' | 'failed'
export type LogLevel = 'info' | 'warn' | 'error'
export type LogTarget = 'python' | 'electron'

export interface DesktopBridge {
  backend: {
    request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T>
    onEvent(listener: (event: BackendEvent) => void): () => void
    onStatus(listener: (status: BackendStatus) => void): () => void
    status(): Promise<BackendStatus>
    diagnostics(): Promise<string>
    retry(): Promise<void>
  }
  logging: {
    write(level: LogLevel, source: string, message: string): Promise<void>
  }
  system: {
    selectFile(): Promise<string | null>
    openLogs(target?: LogTarget): Promise<void>
    closeWindow(): Promise<void>
  }
}

declare global {
  interface Window {
    desktop: DesktopBridge
  }
}
