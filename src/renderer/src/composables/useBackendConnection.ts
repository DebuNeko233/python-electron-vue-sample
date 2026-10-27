/** Subscribe once per page and share connection state with its child components. */

import { onMounted, onUnmounted, ref } from 'vue'
import type { BackendStatus } from '../../../shared/bridge'

export function useBackendConnection() {
  const status = ref<BackendStatus>('starting')
  const diagnostic = ref('')
  const retrying = ref(false)
  let unsubscribe: (() => void) | undefined

  async function refreshDiagnostics(): Promise<void> {
    try {
      diagnostic.value = await window.desktop.backend.diagnostics()
    } catch {
      diagnostic.value = '无法读取后端诊断信息'
    }
  }

  async function retry(): Promise<void> {
    if (retrying.value) return
    retrying.value = true
    diagnostic.value = ''
    try {
      await window.desktop.backend.retry()
    } catch (error) {
      diagnostic.value = String(error)
    } finally {
      retrying.value = false
      if (status.value !== 'ready') await refreshDiagnostics()
    }
  }

  onMounted(async () => {
    unsubscribe = window.desktop.backend.onStatus((nextStatus) => {
      status.value = nextStatus
      if (nextStatus === 'offline' || nextStatus === 'failed') void refreshDiagnostics()
      if (nextStatus === 'ready') diagnostic.value = ''
    })
    status.value = await window.desktop.backend.status()
    if (status.value !== 'ready') await refreshDiagnostics()
  })

  onUnmounted(() => unsubscribe?.())
  return { status, diagnostic, retrying, retry }
}
