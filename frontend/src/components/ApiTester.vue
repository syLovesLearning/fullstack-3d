<script setup lang="ts">
import { ref } from 'vue'
import { rawApiRequest } from '../api/client'

const props = defineProps<{ token: string }>()

interface ApiCase {
  id: string
  name: string
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  body?: unknown
  status?: number
  passed?: boolean
  latencyMs?: number
  responsePreview?: string
}

const running = ref(false)
const cases = ref<ApiCase[]>([
  { id: 'API-01', name: '健康检查', method: 'GET', path: '/health' },
  { id: 'API-02', name: '获取当前登录身份', method: 'GET', path: '/api/v1/auth/me' },
  { id: 'API-03', name: '获取仓储维护概览', method: 'GET', path: '/api/v1/warehouse/summary' },
  { id: 'API-04', name: '查询货品类型列表', method: 'GET', path: '/api/v1/warehouse/cargo-types' },
  { id: 'API-05', name: '查询货架摆放列表', method: 'GET', path: '/api/v1/warehouse/racks' },
  { id: 'API-06', name: '查询固定道路区域', method: 'GET', path: '/api/v1/warehouse/roads' },
<<<<<<< HEAD
  { id: 'API-07', name: '查询货位台账列表', method: 'GET', path: '/api/v1/warehouse/slots' },
=======
  { id: 'API-07', name: '一键幂等导入默认布局', method: 'POST', path: '/api/v1/warehouse/seed-demo' },
>>>>>>> ini
])

async function runSingle(item: ApiCase) {
  try {
    const res = await rawApiRequest(item.method, item.path, props.token, item.body)
    item.status = res.status
    item.passed = res.ok
    item.latencyMs = res.latencyMs
    item.responsePreview = res.bodyText.slice(0, 260)
  } catch (err) {
    item.status = 0
    item.passed = false
    item.responsePreview = err instanceof Error ? err.message : String(err)
  }
}

async function runAll() {
  running.value = true
  for (const item of cases.value) await runSingle(item)
  running.value = false
}
</script>

<template>
  <div class="panel">
    <div class="toolbar">
      <div>
        <h3>接口测试台（统一走 src/api/client.ts）</h3>
<<<<<<< HEAD
        <span class="hint">覆盖健康检查、鉴权、货位台账与仓储维护接口</span>
=======
        <span class="hint">覆盖健康检查、鉴权、一键导入与仓储维护接口</span>
>>>>>>> ini
      </div>
      <button class="btn btn-primary" :disabled="running" @click="runAll">
        {{ running ? '执行中...' : '一键跑全部接口' }}
      </button>
    </div>

    <table class="tbl">
      <thead>
        <tr><th>编号</th><th>接口</th><th>路径</th><th>状态</th><th>耗时</th><th>响应预览</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="c in cases" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.name }}</td>
          <td><code>{{ c.method }} {{ c.path }}</code></td>
          <td>
            <span v-if="c.status !== undefined" class="badge" :class="c.passed ? 'badge-ok' : 'badge-err'">{{ c.status }}</span>
            <span v-else class="hint">未运行</span>
          </td>
          <td>{{ c.latencyMs !== undefined ? `${c.latencyMs}ms` : '-' }}</td>
          <td class="preview">{{ c.responsePreview || '-' }}</td>
          <td><button class="btn" @click="runSingle(c)">单测</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.panel { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; color: #e2e8f0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hint { font-size: 12px; color: #94a3b8; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { border-bottom: 1px solid #334155; padding: 8px 10px; text-align: left; }
.preview { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1; font-family: monospace; font-size: 12px; }
.badge-err { background: #7f1d1d; color: #fecaca; }
</style>
