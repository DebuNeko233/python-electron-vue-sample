<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BackendEvent } from '../../../shared/bridge'
import { cancelDemoTask, getDemoTask, startDemoTask, type DemoTaskStatus } from '../services/backend-api'

const props = defineProps<{ ready: boolean; events: BackendEvent[] }>()

const taskId = ref('')
const progress = ref(0)
const status = ref<DemoTaskStatus | 'idle' | 'missing'>('idle')
const error = ref('')
const busy = ref(false)

const labels: Record<DemoTaskStatus | 'idle' | 'missing', string> = {
  idle: '尚未开始',
  running: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  missing: '旧任务不存在（后端可能已经重启）',
}

async function refresh(): Promise<void> {
  if (!taskId.value || !props.ready) return
  const requestedId = taskId.value
  try {
    const job = await getDemoTask(requestedId)
    if (taskId.value !== requestedId) return
    status.value = job.status
    progress.value = job.progress
  } catch {
    if (taskId.value === requestedId) status.value = 'missing'
  }
}

watch(() => props.ready, (ready) => {
  if (ready) void refresh()
})

watch(() => props.events[0], (message) => {
  if (!message) return
  if (message.event === 'system.connected') {
    void refresh()
    return
  }
  if (message.data.task_id !== taskId.value) return
  if (message.event === 'task.progress') {
    progress.value = Number(message.data.progress ?? 0)
    status.value = 'running'
  }
  if (message.event === 'task.completed') status.value = 'completed'
  if (message.event === 'task.cancelled') status.value = 'cancelled'
})

async function start(): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await startDemoTask()
    taskId.value = result.task_id
    status.value = 'running'
    progress.value = 0
    await refresh()
  } catch (caught) {
    error.value = String(caught)
  } finally {
    busy.value = false
  }
}

async function cancel(): Promise<void> {
  if (!taskId.value || status.value !== 'running' || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const job = await cancelDemoTask(taskId.value)
    status.value = job.status
    progress.value = job.progress
  } catch (caught) {
    error.value = String(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section id="tasks" class="card">
    <div class="panel-heading"><h2>WebSocket 进度示例</h2><span>task.progress</span></div>
    <div class="progress-track"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
    <div class="progress-row">
      <span>进度 {{ progress }}% · {{ labels[status] }}</span>
      <div class="task-buttons">
        <button class="secondary" :disabled="!ready || busy" @click="start">启动模拟任务</button>
        <button class="secondary" :disabled="!ready || busy || status !== 'running'" @click="cancel">取消任务</button>
      </div>
    </div>
    <p v-if="taskId" class="small wrap-text">Task ID: {{ taskId }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
