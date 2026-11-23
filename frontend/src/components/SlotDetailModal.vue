<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AbcClass, RackLayoutItem, SlotType, WarehouseSlotItem } from '../api/warehouseTypes'

const props = defineProps<{
  slot: WarehouseSlotItem | null
  rack: RackLayoutItem | null
  canMerge: boolean
  errMsg: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { id: string; status: 'available' | 'locked' | 'disabled'; slot_type: SlotType; abc_class: AbcClass; allow_mixed: boolean; max_weight_kg: number; remark: string }]
  merge: [id: string]
  split: [id: string]
}>()

const status = ref<'available' | 'locked' | 'disabled'>('available')
const slotType = ref<SlotType>('storage')
const abcClass = ref<AbcClass>('B')
const allowMixed = ref(true)
const maxWeight = ref(1000)
const remark = ref('')

watch(() => props.slot, (s) => {
  if (!s) return
  status.value = s.status === 'merged' ? 'available' : s.status
  slotType.value = s.slot_type
  abcClass.value = s.abc_class
  allowMixed.value = s.allow_mixed
  maxWeight.value = s.max_weight_kg
  remark.value = s.remark
}, { immediate: true })
</script>

<template>
  <div v-if="slot" class="mask" @click.self="emit('close')">
    <div class="dlg">
      <div class="dlg-head">
        <strong>4级库位维护 · {{ slot.slot_code }}</strong>
        <button class="btn btn-xs" @click="emit('close')">✕</button>
      </div>
      <div class="meta">所属：{{ rack?.name }} · B{{ String(slot.bay_idx).padStart(2, '0') }}-L{{ slot.level_idx }}-P{{ slot.slot_idx }} · 占用 {{ slot.span_slots }} 格</div>

      <div class="row2">
        <label class="field">库位状态
          <select v-model="status" class="inp">
            <option value="available">可用 (available)</option>
            <option value="locked">锁定盘点 (locked)</option>
            <option value="disabled">维修停用 (disabled)</option>
          </select>
        </label>
        <label class="field">库位类型
          <select v-model="slotType" class="inp">
            <option value="storage">存储位 (Storage)</option>
            <option value="pick">拣货位 (Pick)</option>
            <option value="staging">暂存区 (Staging)</option>
            <option value="quarantine">隔离待检 (Quarantine)</option>
          </select>
        </label>
      </div>

      <div class="row3">
        <label class="field">ABC 热度
          <select v-model="abcClass" class="inp"><option value="A">A 高频</option><option value="B">B 中频</option><option value="C">C 低频</option></select>
        </label>
        <label class="field">单格限重 (kg)
          <input v-model.number="maxWeight" type="number" class="inp" />
        </label>
        <label class="field chk-wrap">混放规则
          <label class="chk"><input v-model="allowMixed" type="checkbox" /> 允许混批/混品</label>
        </label>
      </div>

      <label class="field">备注 / 冻结原因
        <input v-model="remark" class="inp" placeholder="例如：横梁检修冻结 / 大规格电缆盘合并位" />
      </label>

      <p v-if="errMsg" class="err">{{ errMsg }}</p>
      <div class="actions">
        <button v-if="slot.span_slots === 2" class="btn" @click="emit('split', slot.id)">拆分为 2 个库位</button>
        <button v-else-if="canMerge" class="btn" @click="emit('merge', slot.id)">与下一位合并 (2格)</button>
        <button class="btn btn-primary" @click="emit('save', { id: slot.id, status, slot_type: slotType, abc_class: abcClass, allow_mixed: allowMixed, max_weight_kg: maxWeight, remark })">保存库位</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; z-index: 60; }
.dlg { width: 440px; background: #1e293b; border: 1px solid #475569; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; color: #f8fafc; }
.dlg-head { display: flex; justify-content: space-between; align-items: center; }
.meta { font-size: 12px; color: #94a3b8; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #cbd5e1; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.row3 { display: grid; grid-template-columns: 100px 120px 1fr; gap: 8px; }
.chk { display: flex; align-items: center; gap: 6px; padding-top: 6px; font-size: 12px; }
.inp { padding: 6px 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 12px; }
.err { margin: 0; font-size: 12px; color: #fca5a5; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-xs { padding: 2px 7px; font-size: 11px; }
</style>
