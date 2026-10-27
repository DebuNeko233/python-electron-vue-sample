<script setup lang="ts">
import BackendNotice from '../components/BackendNotice.vue'
import DesktopDemo from '../components/DesktopDemo.vue'
import EchoDemo from '../components/EchoDemo.vue'
import EventLog from '../components/EventLog.vue'
import TaskDemo from '../components/TaskDemo.vue'
import { useBackendConnection } from '../composables/useBackendConnection'
import { useBackendEvents } from '../composables/useBackendEvents'

const { status, diagnostic, retrying, retry } = useBackendConnection()
const { events } = useBackendEvents()
</script>

<template>
  <main id="overview" class="content">
    <header class="topbar">
      <div>
        <p class="eyebrow">DEVELOPER STARTER</p>
        <h1>应用概览</h1>
        <p class="subtitle">可独立调试、离线分发的桌面应用起点。</p>
      </div>
      <div class="status" :class="status"><span class="indicator"></span> Python {{ status }}</div>
    </header>

    <BackendNotice :status="status" :diagnostic="diagnostic" :retrying="retrying" @retry="retry" />

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
      <div class="panel-stack">
        <EchoDemo :ready="status === 'ready'" />
        <TaskDemo :ready="status === 'ready'" :events="events" />
      </div>
      <div class="panel-stack">
        <DesktopDemo />
        <EventLog :events="events" />
      </div>
    </div>

    <footer>关闭应用窗口只停止它自己托管的 Python；独立开发后端不受影响。</footer>
  </main>
</template>
