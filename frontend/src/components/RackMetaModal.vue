<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AbcClass, CargoTypeItem, RackLayoutItem, SlotType } from '../api/warehouseTypes'

const props = defineProps<{
  rack: RackLayoutItem | null
  cargos: CargoTypeItem[]
  errMsg: string
}>()

const emit = defineEmits<{
  close: []
  saveMeta: [payload: { id: string; name: string; max_load_kg: number; cargo_type_code: string | null }]
  batchRack: [payload: { rack_id: string; action: 'lock' | 'unlock' | 'disable' | 'set_abc' | 'set_type'; abc_class?: AbcClass; slot_type?: SlotType }]
}>()

const name = ref('')
const maxLoad = ref(2000)
const cargoCode = ref('')

watch(() => props.rack, (r) => {
  if (!r) return
  name.value = r.name
  maxLoad.value = r.max_load_kg
  cargoCode.value = r.cargo_type_code || ''
}, { immediate: true })
</script>

<template>
  <div v-if="rack" class="mask" @click.self="emit('close')">
    <div class="dlg">
      <div class="dlg-head">
        <strong>1级货架维护 · {{ rack.code }}</strong>
        <button class="btn btn-xs" @click="emit('close')">✕</button>
      </div>
      <div class="meta">规格：{{ rack.length_m }}m × {{ rack.width_m }}m × {{ rack.height_m }}m · {{ rack.bays }}跨 × {{ rack.levels }}层 × {{ rack.slots_per_bay }}位</div>

      <label class="field">货架名称
        <input v-model="name" class="inp" />
      </label>
      <div class="row2">
        <label class="field">单层限重 (kg)
          <input v-model.number="maxLoad" type="number" class="inp" />
        </label>
        <label class="field">默认货品字典
          <select v-model="cargoCode" class="inp">
            <option value="">不指定</option>
            <option v-for="c in cargos" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
          </select>
        </label>
      </div>

      <div class="batch-box">
        <div class="b-title">整排批量维护（作用于当前货架全部库位）</div>
        <div class="b-btns">
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'unlock' })">全排可用</button>
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'lock' })">全排锁定</button>
          <button class="btn btn-xs btn-del" @click="emit('batchRack', { rack_id: rack.id, action: 'disable' })">全排停用</button>
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'set_abc', abc_class: 'A' })">全刷A级</button>
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'set_abc', abc_class: 'B' })">全刷B级</button>
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'set_type', slot_type: 'pick' })">全设拣货位</button>
          <button class="btn btn-xs" @click="emit('batchRack', { rack_id: rack.id, action: 'set_type', slot_type: 'storage' })">全设存储位</button>
        </div>
      </div>

      <p v-if="errMsg" class="err">{{ errMsg }}</p>
      <div class="actions">
        <button class="btn" @click="emit('close')">关闭</button>
        <button class="btn btn-primary" @click="emit('saveMeta', { id: rack.id, name: name.trim(), max_load_kg: maxLoad, cargo_type_code: cargoCode || null })">保存货架属性</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; z-index: 65; }
.dlg { width: 450px; background: #1e293b; border: 1px solid #475569; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; color: #f8fafc; }
.dlg-head { display: flex; justify-content: space-between; align-items: center; }
.meta { font-size: 12px; color: #94a3b8; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #cbd5e1; }
.row2 { display: grid; grid-template-columns: 140px 1fr; gap: 8px; }
.inp { padding: 6px 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 12px; }
.batch-box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; }
.b-title { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.b-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.err { margin: 0; font-size: 12px; color: #fca5a5; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }
.btn-del { border-color: #991b1b; color: #fca5a5; }
</style>
