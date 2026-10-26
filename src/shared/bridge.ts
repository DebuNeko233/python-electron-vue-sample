/** Types shared by the renderer and the secure preload bridge. */

export interface BackendEvent {
  event: string
  sequence: number
  data: Record<string, unknown>
}

export type BackendStatus = 'starting' | 'ready' | 'offline' | 'stopping' | 'failed'

export interface DesktopBridge {
  backend: {
    request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T>
    onEvent(listener: (event: BackendEvent) => void): () => void
    onStatus(listener: (status: BackendStatus) => void): () => void
    status(): Promise<BackendStatus>
  }
  system: {
    selectFile(): Promise<string | null>
    openLogs(): Promise<void>
    closeWindow(): Promise<void>
  }
}

declare global {
  interface Window {
    desktop: DesktopBridge
  }
}
