<script setup lang="ts">
import { ref } from 'vue'
import type { RoadZoneItem } from '../api/warehouseTypes'

defineProps<{ items: RoadZoneItem[]; selectedRoadId: string }>()
const emit = defineEmits<{
  select: [id: string]
  create: [body: Omit<RoadZoneItem, 'id' | 'is_locked'>]
  remove: [id: string]
}>()

const code = ref('ROAD-CROSS-1')
const name = ref('横向叉车作业通道')
const pos_x = ref(0)
const pos_z = ref(24)
const length_m = ref(4)
const width_m = ref(86)

function submit() {
  if (!code.value.trim() || !name.value.trim()) return
  emit('create', {
    code: code.value.trim(), name: name.value.trim(), pos_x: pos_x.value, pos_z: pos_z.value,
    length_m: length_m.value, width_m: width_m.value, drivable_forklift: true,
  })
}
</script>

<template>
  <div class="sub-card">
    <h4>特殊区域道路维护（点击行可高亮左侧画布道路）</h4>
    <div class="form-row">
      <input v-model="code" class="inp sm" placeholder="编码" />
      <input v-model="name" class="inp" placeholder="通道名称" />
      <label class="lbl">X <input v-model.number="pos_x" class="inp xs" type="number" /></label>
      <label class="lbl">Z <input v-model.number="pos_z" class="inp xs" type="number" /></label>
      <label class="lbl">宽(X) <input v-model.number="width_m" class="inp xs" type="number" /></label>
      <label class="lbl">长(Z) <input v-model.number="length_m" class="inp xs" type="number" /></label>
      <button class="btn btn-primary" @click="submit">新增道路</button>
    </div>
    <div class="list">
      <div v-for="r in items" :key="r.id" class="row" :class="{ active: r.id === selectedRoadId }" @click="emit('select', r.id)">
        <span class="badge" :class="r.is_locked ? 'badge-warn' : 'badge-ok'">{{ r.is_locked ? '固定写死' : '特殊通道' }}</span>
        <strong>{{ r.name }}</strong>
        <span class="meta">({{ r.pos_x }}, {{ r.pos_z }}) · {{ r.width_m }}m × {{ r.length_m }}m</span>
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
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; min-width: 100px; }
.sm { width: 96px; min-width: 96px; }
.xs { width: 54px; min-width: 54px; }
.list { display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; }
.row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 8px; background: #1e293b; border: 1px solid transparent; border-radius: 6px; cursor: pointer; }
.row.active { border-color: #34d399; background: #064e3b; }
.meta { color: #94a3b8; margin-left: auto; }
.badge-warn { background: #78350f; color: #fde68a; }
.btn-xs { padding: 2px 6px; font-size: 11px; }
</style>
