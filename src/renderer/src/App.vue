<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { BackendEvent, BackendStatus } from '../../shared/bridge'

const status = ref<BackendStatus>('starting')
const input = ref('Hello from Vue!')
const echoResult = ref('还没有发送请求')
const progress = ref(0)
const taskId = ref('')
const selectedFile = ref('')
const error = ref('')
const events = ref<string[]>([])

let unsubscribeEvent: (() => void) | undefined
let unsubscribeStatus: (() => void) | undefined

function addEvent(message: BackendEvent): void {
  events.value.unshift(message.event + ' · ' + JSON.stringify(message.data))
  events.value = events.value.slice(0, 12)
  if (message.event === 'task.progress') {
    progress.value = Number(message.data.progress ?? 0)
  }
}

async function echo(): Promise<void> {
  error.value = ''
  try {
    const response = await window.desktop.backend.request<{ message: string; from: string }>(
      'POST', '/api/echo', { message: input.value },
    )
    echoResult.value = response.message + ' · ' + response.from
  } catch (caught) {
    error.value = String(caught)
  }
}

async function runDemo(): Promise<void> {
  error.value = ''
  progress.value = 0
  try {
    const response = await window.desktop.backend.request<{ task_id: string }>(
      'POST', '/api/tasks/demo',
    )
    taskId.value = response.task_id
  } catch (caught) {
    error.value = String(caught)
  }
}

async function selectFile(): Promise<void> {
  selectedFile.value = (await window.desktop.system.selectFile()) ?? '已取消选择'
}

onMounted(async () => {
  unsubscribeEvent = window.desktop.backend.onEvent(addEvent)
  unsubscribeStatus = window.desktop.backend.onStatus((value) => { status.value = value })
  status.value = await window.desktop.backend.status()
})

onUnmounted(() => {
  unsubscribeEvent?.()
  unsubscribeStatus?.()
})
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand"><span class="logo">P</span> SampleApp</div>
      <div class="nav-item selected">◈ &nbsp; 应用概览</div>
      <div class="nav-item">◇ &nbsp; API 示例</div>
      <div class="nav-item">◎ &nbsp; 实时事件</div>
      <div class="sidebar-note">Python + Electron + Vue<br />通用桌面应用模板</div>
    </aside>

    <main class="content">
      <header class="topbar">
        <div>
          <p class="eyebrow">DEVELOPER STARTER</p>
          <h1>应用概览</h1>
          <p class="subtitle">一个可以独立调试、离线分发的桌面应用起点。</p>
        </div>
        <div class="status" :class="status"><span class="indicator"></span> Python {{ status }}</div>
      </header>

      <div class="cards">
        <section class="card metric">
          <div class="metric-label">Electron IPC</div>
          <strong>桌面能力</strong>
          <p>窗口、文件对话框、应用目录</p>
        </section>
        <section class="card metric">
          <div class="metric-label">HTTP · REST</div>
          <strong>业务接口</strong>
          <p>请求、响应与错误处理</p>
        </section>
        <section class="card metric">
          <div class="metric-label">WebSocket</div>
          <strong>实时事件</strong>
          <p>任务状态、进度与通知</p>
        </section>
      </div>

      <div class="panels">
        <section class="card">
          <div class="panel-heading"><h2>HTTP 请求示例</h2><span>POST /api/echo</span></div>
          <label for="echo">发送给 Python 的内容</label>
          <div class="input-row">
            <input id="echo" v-model="input" maxlength="500" @keyup.enter="echo" />
            <button @click="echo">发送</button>
          </div>
          <div class="result">{{ echoResult }}</div>
          <div class="panel-heading task-heading"><h2>WebSocket 进度示例</h2><span>task.progress</span></div>
          <div class="progress-track"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
          <div class="progress-row"><span>任务进度 {{ progress }}%</span><button class="secondary" @click="runDemo">启动模拟任务</button></div>
          <p v-if="taskId" class="small">Task ID: {{ taskId }}</p>
        </section>

        <section class="card">
          <div class="panel-heading"><h2>Electron IPC 示例</h2><span>preload bridge</span></div>
          <p class="description">文件选择由 Electron 主进程执行，Vue 不直接访问 Node.js。</p>
          <button class="secondary" @click="selectFile">选择文件</button>
          <p class="small wrap-text">{{ selectedFile || '尚未选择文件' }}</p>
          <hr />
          <div class="panel-heading"><h2>实时事件</h2><span>最近 12 条</span></div>
          <div class="event-log">
            <p v-if="!events.length" class="muted">等待 WebSocket 事件…</p>
            <p v-for="(event, index) in events" :key="index">{{ event }}</p>
          </div>
          <button class="text-button" @click="window.desktop.system.openLogs()">打开日志目录</button>
        </section>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <footer>关闭应用窗口会停止由此应用托管的 Python 后端；独立开发后端不受影响。</footer>
    </main>
  </div>
</template>
