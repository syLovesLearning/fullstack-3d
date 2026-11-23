<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AbcClass, RackLayoutItem, SlotType, WarehouseSlotItem } from '../api/warehouseTypes'

const props = defineProps<{
  target: { rack: RackLayoutItem; bayIdx: number; levelIdx?: number } | null
  slots: WarehouseSlotItem[]
}>()

const emit = defineEmits<{
  close: []
  batchApply: [payload: { rack_id: string; bay_idx: number; level_idx?: number; action: 'lock' | 'unlock' | 'disable' | 'set_abc' | 'set_type'; abc_class?: AbcClass; slot_type?: SlotType }]
  mergeLevel: [slotId: string]
  splitLevel: [slotId: string]
}>()

const abcClass = ref<AbcClass>('A')
const slotType = ref<SlotType>('storage')

const scopedSlots = computed(() => {
  if (!props.target) return []
  return props.slots.filter((s) =>
    s.rack_id === props.target!.rack.id &&
    s.bay_idx === props.target!.bayIdx &&
    (props.target!.levelIdx === undefined || s.level_idx === props.target!.levelIdx),
  )
})

const stats = computed(() => ({
  total: scopedSlots.value.length,
  avail: scopedSlots.value.filter((s) => s.status === 'available').length,
  merged: scopedSlots.value.filter((s) => s.span_slots === 2).length,
  locked: scopedSlots.value.filter((s) => s.status === 'locked').length,
  disabled: scopedSlots.value.filter((s) => s.status === 'disabled').length,
}))

const mergeableP1 = computed(() => {
  if (props.target?.levelIdx === undefined) return null
  const p1 = scopedSlots.value.find((s) => s.slot_idx === 1)
  const p2 = scopedSlots.value.find((s) => s.slot_idx === 2)
  return p1 && p2 && p1.status === 'available' && p1.span_slots === 1 && p2.status === 'available' && p2.span_slots === 1 ? p1 : null
})

const mergedP1 = computed(() => {
  if (props.target?.levelIdx === undefined) return null
  return scopedSlots.value.find((s) => s.span_slots === 2) ?? null
})
</script>

<template>
  <div v-if="target" class="mask" @click.self="emit('close')">
    <div class="dlg">
      <div class="dlg-head">
        <strong>{{ target.levelIdx ? '3级层维护' : '2级跨维护' }} · {{ target.rack.code }}-B{{ String(target.bayIdx).padStart(2, '0') }}{{ target.levelIdx ? `-L${target.levelIdx}` : '' }}</strong>
        <button class="btn btn-xs" @click="emit('close')">✕</button>
      </div>

      <div class="stat-bar">
        <span>总位 <b>{{ stats.total }}</b></span>
        <span>可用 <b>{{ stats.avail }}</b></span>
        <span>合并 <b>{{ stats.merged }}</b></span>
        <span>锁定 <b>{{ stats.locked }}</b></span>
        <span>停用 <b>{{ stats.disabled }}</b></span>
      </div>

      <div class="sec">
        <div class="s-title">批量状态控制</div>
        <div class="b-btns">
          <button class="btn btn-xs" @click="emit('batchApply', { rack_id: target.rack.id, bay_idx: target.bayIdx, level_idx: target.levelIdx, action: 'unlock' })">全部设为可用</button>
          <button class="btn btn-xs" @click="emit('batchApply', { rack_id: target.rack.id, bay_idx: target.bayIdx, level_idx: target.levelIdx, action: 'lock' })">全部锁定盘点</button>
          <button class="btn btn-xs btn-del" @click="emit('batchApply', { rack_id: target.rack.id, bay_idx: target.bayIdx, level_idx: target.levelIdx, action: 'disable' })">全部维修停用</button>
        </div>
      </div>

      <div class="sec row2">
        <div class="inline-grp">
          <select v-model="abcClass" class="inp"><option value="A">A 高频</option><option value="B">B 中频</option><option value="C">C 低频</option></select>
          <button class="btn btn-xs btn-primary" @click="emit('batchApply', { rack_id: target.rack.id, bay_idx: target.bayIdx, level_idx: target.levelIdx, action: 'set_abc', abc_class: abcClass })">应用 ABC</button>
        </div>
        <div class="inline-grp">
          <select v-model="slotType" class="inp"><option value="storage">存储位</option><option value="pick">拣货位</option><option value="staging">暂存区</option><option value="quarantine">待检区</option></select>
          <button class="btn btn-xs btn-primary" @click="emit('batchApply', { rack_id: target.rack.id, bay_idx: target.bayIdx, level_idx: target.levelIdx, action: 'set_type', slot_type: slotType })">应用类型</button>
        </div>
      </div>

      <div v-if="target.levelIdx" class="sec">
        <div class="s-title">本层库位合并 / 拆分</div>
        <div class="b-btns">
          <button v-if="mergeableP1" class="btn btn-xs btn-primary" @click="emit('mergeLevel', mergeableP1.id)">合并本层 P1+P2 为 2 格大库位</button>
          <button v-else-if="mergedP1" class="btn btn-xs" @click="emit('splitLevel', mergedP1.id)">拆分还原为 2 个独立库位</button>
          <span v-else class="hint">当前层库位已锁定/停用或非双位结构，暂不可合并</span>
        </div>
      </div>

      <div class="actions"><button class="btn" @click="emit('close')">完成关闭</button></div>
    </div>
  </div>
</template>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; z-index: 65; }
.dlg { width: 460px; background: #1e293b; border: 1px solid #475569; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; color: #f8fafc; }
.dlg-head { display: flex; justify-content: space-between; align-items: center; }
.stat-bar { display: flex; gap: 14px; font-size: 12px; color: #cbd5e1; background: #0f172a; padding: 8px 10px; border-radius: 6px; }
.stat-bar b { color: #38bdf8; }
.sec { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; }
.s-title { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.b-btns { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.inline-grp { display: flex; gap: 6px; align-items: center; }
.inp { flex: 1; padding: 5px 6px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; }
.hint { font-size: 11px; color: #64748b; }
.actions { display: flex; justify-content: flex-end; }
.btn-xs { padding: 4px 8px; font-size: 11px; }
.btn-del { border-color: #991b1b; color: #fca5a5; }
</style>
