<script setup lang="ts">
import { ref } from 'vue'
import { openLogDirectory, selectFile } from '../services/desktop'

const selectedFile = ref('')
const error = ref('')

async function chooseFile(): Promise<void> {
  error.value = ''
  try {
    selectedFile.value = (await selectFile()) ?? '已取消选择'
  } catch (caught) {
    error.value = String(caught)
  }
}

async function openLogs(): Promise<void> {
  error.value = ''
  try {
    await openLogDirectory()
  } catch (caught) {
    error.value = String(caught)
  }
}
</script>

<template>
  <section id="ipc" class="card">
    <div class="panel-heading"><h2>Electron IPC 示例</h2><span>preload bridge</span></div>
    <p class="description">文件选择由 Electron 主进程执行，Vue 不直接访问 Node.js。</p>
    <button class="secondary" @click="chooseFile">选择文件</button>
    <p class="small wrap-text">{{ selectedFile || '尚未选择文件' }}</p>
    <button class="text-button" @click="openLogs">打开日志目录</button>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
