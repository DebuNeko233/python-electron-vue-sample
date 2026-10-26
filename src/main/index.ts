/** Electron is responsible for desktop permissions and process ownership. */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BackendManager } from './backend-manager'
import { EventStream } from './event-stream'
import { installLogging } from './logging'
import type { BackendStatus } from '../shared/bridge'

const mainDirectory = path.dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let closing = false
let allowQuit = false

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

function publishStatus(status: BackendStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend:status', status)
  }
}

const backend = new BackendManager(publishStatus)
const stream = new EventStream(backend, (event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend:event', event)
  }
})

function checkSender(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || mainWindow.isDestroyed() ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Unauthorized IPC sender')
  }
}

function registerIpc(): void {
  ipcMain.handle('backend:status', (event) => {
    checkSender(event)
    return backend.status
  })
  ipcMain.handle('backend:request', (event, method: unknown, apiPath: unknown, body?: unknown) => {
    checkSender(event)
    if ((method !== 'GET' && method !== 'POST') || typeof apiPath !== 'string') {
      throw new Error('Invalid API request')
    }
    return backend.request(method, apiPath, body)
  })
  ipcMain.handle('system:select-file', async (event) => {
    checkSender(event)
    const selection = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile'] })
    return selection.canceled ? null : selection.filePaths[0]
  })
  ipcMain.handle('system:open-logs', async (event) => {
    checkSender(event)
    const directory = path.join(app.getPath('userData'), 'data', 'logs')
    fs.mkdirSync(directory, { recursive: true })
    const error = await shell.openPath(directory)
    if (error) throw new Error(error)
  })
  ipcMain.handle('system:close-window', (event) => {
    checkSender(event)
    mainWindow?.close()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 790,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: path.join(mainDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const developmentUrl = process.env.ELECTRON_RENDERER_URL
    const indexFile = path.join(mainDirectory, '../renderer/index.html')
    const allowedFile = pathToFileURL(indexFile).href
    if (url !== allowedFile && !(developmentUrl && url.startsWith(developmentUrl))) {
      event.preventDefault()
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(mainDirectory, '../renderer/index.html'))
  }
  mainWindow.on('closed', () => { mainWindow = null })
}

async function startBackend(): Promise<void> {
  try {
    await backend.start()
    stream.connect()
  } catch (error) {
    console.error('Python startup failed. Read the backend log for details:', error)
    publishStatus('failed')
  }
}

app.on('window-all-closed', () => app.quit())
app.on('before-quit', (event) => {
  if (allowQuit || closing) return
  event.preventDefault()
  closing = true
  stream.stop()
  void backend.stop().finally(() => {
    allowQuit = true
    app.quit()
  })
})

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return
  installLogging()
  registerIpc()
  createWindow()
  void startBackend()
})
