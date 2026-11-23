<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RackLayoutItem } from '../api/warehouseTypes'

const props = defineProps<{
  items: RackLayoutItem[]
  selectedId: string
}>()

const emit = defineEmits<{
  select: [id: string]
  editMeta: [rack: RackLayoutItem]
  rotate: [rack: RackLayoutItem]
  remove: [id: string]
  goSlots: [id: string]
}>()

const kw = ref('')
const filtered = computed(() => {
  const q = kw.value.trim().toLowerCase()
  return q ? props.items.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : props.items
})
</script>

<template>
  <div class="sub-card">
    <div class="head-row">
      <h4>货架台账 CRUD（点击定位左侧画布）</h4>
      <input v-model="kw" class="inp sm" placeholder="搜编码 / 名称..." />
    </div>
    <div class="list">
      <div
        v-for="r in filtered"
        :key="r.id"
        class="row"
        :class="{ active: r.id === selectedId }"
        @click="emit('select', r.id)"
      >
        <div class="info">
          <strong>{{ r.code }}</strong>
          <span>{{ r.name }}</span>
          <span class="meta">{{ r.bays }}跨×{{ r.levels }}层({{ r.total_slots }}位) · {{ r.max_load_kg }}kg · ({{ r.pos_x }}, {{ r.pos_z }})</span>
        </div>
        <div class="ops" @click.stop>
          <button class="btn btn-xs" @click="emit('editMeta', r)">改</button>
          <button class="btn btn-xs" @click="emit('rotate', r)">90°</button>
          <button class="btn btn-xs btn-primary" @click="emit('goSlots', r.id)">库位</button>
          <button class="btn btn-xs btn-del" @click="emit('remove', r.id)">删</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
.head-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
h4 { margin: 0; font-size: 13px; color: #f8fafc; }
.inp { padding: 4px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; width: 130px; }
.list { display: flex; flex-direction: column; gap: 6px; max-height: 210px; overflow-y: auto; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; padding: 6px 8px; background: #1e293b; border: 1px solid transparent; border-radius: 6px; cursor: pointer; }
.row.active { border-color: #facc15; background: #172554; }
.info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
.meta { color: #94a3b8; font-size: 11px; }
.ops { display: flex; gap: 4px; flex-shrink: 0; }
.btn-xs { padding: 2px 6px; font-size: 11px; }
.btn-del { border-color: #991b1b; color: #fca5a5; }
</style>
