<script setup lang="ts">
import { reactive } from 'vue'
import type { CargoTypeItem, RackLayoutItem } from '../api/warehouseTypes'
import type { RackUpdateBody } from '../api/client'
import { RACK_MODEL_OPTIONS } from '../utils/warehouseGeometry'

const props = defineProps<{ rack: RackLayoutItem; cargos: CargoTypeItem[] }>()
const emit = defineEmits<{
  close: []
  save: [body: RackUpdateBody]
}>()

const form = reactive({
  name: props.rack.name,
  length_m: props.rack.length_m,
  width_m: props.rack.width_m,
  height_m: props.rack.height_m,
  bays: props.rack.bays,
  levels: props.rack.levels,
  slots_per_bay: props.rack.slots_per_bay,
  max_load_kg: props.rack.max_load_kg,
  pos_x: props.rack.pos_x,
  pos_z: props.rack.pos_z,
  rotation_deg: props.rack.rotation_deg,
  model_key: props.rack.model_key,
  cargo_type_code: props.rack.cargo_type_code ?? '',
})

const FIELDS = ['name', 'length_m', 'width_m', 'height_m', 'bays', 'levels', 'slots_per_bay', 'max_load_kg', 'pos_x', 'pos_z', 'rotation_deg', 'model_key', 'cargo_type_code'] as const

function save() {
  if (!form.name.trim()) return
  const body: RackUpdateBody = {}
  const rackRaw = props.rack as unknown as Record<string, unknown>
  for (const k of FIELDS) {
    const next = k === 'name' ? form.name.trim() : k === 'cargo_type_code' ? (form.cargo_type_code || null) : form[k]
    if (next !== rackRaw[k]) (body as unknown as Record<string, unknown>)[k] = next
  }
  emit('save', body)
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-head">
        <b>编辑货架 <span class="code">{{ rack.code }}</span></b>
        <span class="cur-slots">当前 {{ rack.total_slots }} 库位</span>
        <button class="btn btn-xs" @click="emit('close')">×</button>
      </div>
      <div class="grid">
        <label>名称 <input v-model="form.name" class="inp" /></label>
        <label>长(m) <input v-model.number="form.length_m" class="inp xs" type="number" step="0.1" /></label>
        <label>宽(m) <input v-model.number="form.width_m" class="inp xs" type="number" step="0.1" /></label>
        <label>高(m) <input v-model.number="form.height_m" class="inp xs" type="number" step="0.1" /></label>
        <label>跨 <input v-model.number="form.bays" class="inp xs" type="number" /></label>
        <label>层 <input v-model.number="form.levels" class="inp xs" type="number" /></label>
        <label>位/格 <input v-model.number="form.slots_per_bay" class="inp xs" type="number" /></label>
        <label>承重(kg) <input v-model.number="form.max_load_kg" class="inp sm" type="number" /></label>
        <label>X <input v-model.number="form.pos_x" class="inp xs" type="number" step="0.5" /></label>
        <label>Z <input v-model.number="form.pos_z" class="inp xs" type="number" step="0.5" /></label>
        <label>角度
          <select v-model.number="form.rotation_deg" class="inp sm"><option :value="0">0°</option><option :value="90">90°</option></select>
        </label>
        <label class="wide">3D 模型
          <select v-model="form.model_key" class="inp"><option v-for="m in RACK_MODEL_OPTIONS" :key="m.key" :value="m.key">{{ m.label }}</option></select>
        </label>
        <label class="wide">货品类型
          <select v-model="form.cargo_type_code" class="inp">
            <option value="">未绑定</option>
            <option v-for="c in cargos" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
          </select>
        </label>
      </div>
      <p class="preview">保存后库位 = {{ form.bays }} × {{ form.levels }} × {{ form.slots_per_bay }} = <b>{{ form.bays * form.levels * form.slots_per_bay }}</b> 个</p>
      <div class="modal-foot">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!form.name.trim()" @click="save">保存修改</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.72); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow-y: auto; background: #0f172a; border: 1px solid #475569; border-radius: 10px; padding: 14px 16px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5); }
.modal-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 14px; color: #f8fafc; }
.code { color: #38bdf8; }
.cur-slots { font-size: 11px; color: #94a3b8; margin-left: auto; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px 10px; }
.grid label { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; flex-wrap: wrap; }
.grid .wide { grid-column: span 2; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; min-width: 0; flex: 1; }
.xs { width: 58px; } .sm { width: 86px; }
.preview { margin: 10px 0 0; font-size: 11px; color: #94a3b8; }
.preview b { color: #34d399; }
.modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.btn-xs { padding: 2px 10px; font-size: 13px; }
</style>
