/** Shared, bounded list of the latest events from the Electron WebSocket bridge. */

import { onMounted, onUnmounted, ref } from 'vue'
import type { BackendEvent } from '../../../shared/bridge'

export function useBackendEvents() {
  const events = ref<BackendEvent[]>([])
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    unsubscribe = window.desktop.backend.onEvent((message) => {
      events.value = [message, ...events.value].slice(0, 12)
    })
  })
  onUnmounted(() => unsubscribe?.())
  return { events }
}
