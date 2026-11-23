<script setup lang="ts">
import { ref } from 'vue'
import type { CampusRoadItem } from '../api/warehouseTypes'

defineProps<{ items: CampusRoadItem[]; selectedRoadId: string }>()
const emit = defineEmits<{
  select: [id: string]
  create: [body: Omit<CampusRoadItem, 'id' | 'is_locked'>]
  remove: [id: string]
}>()

const code = ref('RD-LINK-1')
const name = ref('园区横向联络道')
const x = ref(120)
const y = ref(196)
const w = ref(200)
const h = ref(10)

function submit() {
  if (!code.value.trim() || !name.value.trim()) return
  emit('create', { code: code.value.trim(), name: name.value.trim(), x: x.value, y: y.value, w: w.value, h: h.value })
}
</script>

<template>
  <div class="sub-card">
    <h4>园区道路维护（点击行可高亮左侧画布道路）</h4>
    <div class="form-row">
      <input v-model="code" class="inp sm" placeholder="编码" />
      <input v-model="name" class="inp" placeholder="道路名称" />
      <label class="lbl">X <input v-model.number="x" class="inp xs" type="number" /></label>
      <label class="lbl">Y <input v-model.number="y" class="inp xs" type="number" /></label>
      <label class="lbl">宽W <input v-model.number="w" class="inp xs" type="number" /></label>
      <label class="lbl">高H <input v-model.number="h" class="inp xs" type="number" /></label>
      <button class="btn btn-primary" @click="submit">新增园区道路</button>
    </div>
    <div class="list">
      <div v-for="r in items" :key="r.id" class="row" :class="{ active: r.id === selectedRoadId }" @click="emit('select', r.id)">
        <span class="badge" :class="r.is_locked ? 'badge-warn' : 'badge-ok'">{{ r.is_locked ? '主干道' : '自定义' }}</span>
        <strong>{{ r.name }}</strong>
        <span class="meta">({{ r.x }}, {{ r.y }}) · {{ r.w }}×{{ r.h }}m</span>
        <button v-if="!r.is_locked" class="btn btn-xs" @click.stop="emit('remove', r.id)">删</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
h4 { margin: 0 0 10px; font-size: 13px; color: #f8fafc; }
.form-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
.lbl { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; min-width: 96px; }
.sm { width: 88px; min-width: 88px; }
.xs { width: 52px; min-width: 52px; }
.list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
.row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 8px; background: #1e293b; border: 1px solid transparent; border-radius: 6px; cursor: pointer; }
.row.active { border-color: #34d399; background: #064e3b; }
.meta { color: #94a3b8; margin-left: auto; }
.badge-warn { background: #78350f; color: #fde68a; }
.btn-xs { padding: 2px 6px; font-size: 11px; }
</style>
