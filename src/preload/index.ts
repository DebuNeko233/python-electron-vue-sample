import { contextBridge, ipcRenderer } from 'electron'
import type { BackendEvent, BackendStatus, DesktopBridge } from '../shared/bridge'

const desktop: DesktopBridge = {
  backend: {
    request: (method, path, body) =>
      ipcRenderer.invoke('backend:request', method, path, body),
    onEvent(listener) {
      const handler = (_event: Electron.IpcRendererEvent, message: BackendEvent) => listener(message)
      ipcRenderer.on('backend:event', handler)
      return () => ipcRenderer.removeListener('backend:event', handler)
    },
    onStatus(listener) {
      const handler = (_event: Electron.IpcRendererEvent, status: BackendStatus) => listener(status)
      ipcRenderer.on('backend:status', handler)
      return () => ipcRenderer.removeListener('backend:status', handler)
    },
    status: () => ipcRenderer.invoke('backend:status'),
  },
  system: {
    selectFile: () => ipcRenderer.invoke('system:select-file'),
    openLogs: () => ipcRenderer.invoke('system:open-logs'),
    closeWindow: () => ipcRenderer.invoke('system:close-window'),
  },
}

contextBridge.exposeInMainWorld('desktop', desktop)
