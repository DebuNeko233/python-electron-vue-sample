<script setup lang="ts">
import { ref } from 'vue'
import { echoMessage } from '../services/backend-api'

defineProps<{ ready: boolean }>()

const input = ref('Hello from Vue!')
const result = ref('还没有发送请求')
const error = ref('')
const sending = ref(false)

async function send(): Promise<void> {
  if (sending.value) return
  sending.value = true
  error.value = ''
  try {
    const response = await echoMessage(input.value)
    result.value = response.message + ' · ' + response.from
  } catch (caught) {
    error.value = String(caught)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="http" class="card">
    <div class="panel-heading"><h2>HTTP 请求示例</h2><span>POST /api/echo</span></div>
    <label for="echo-input">发送给 Python 的内容</label>
    <div class="input-row">
      <input id="echo-input" v-model="input" maxlength="500" @keyup.enter="send" />
      <button :disabled="!ready || sending || !input.trim()" @click="send">发送</button>
    </div>
    <div class="result">{{ result }}</div>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
