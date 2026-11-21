<script setup lang="ts">
<<<<<<< HEAD
import { ref, toRef } from 'vue'
import type { CargoTypeItem } from '../api/warehouseTypes'
import { CARGO_MODEL_OPTIONS } from '../utils/warehouseGeometry'
import { usePagination } from '../composables/usePagination'
import ListPagination from './ListPagination.vue'

const props = defineProps<{ items: CargoTypeItem[] }>()
=======
import { ref } from 'vue'
import type { CargoTypeItem } from '../api/warehouseTypes'
import { CARGO_MODEL_OPTIONS } from '../utils/warehouseGeometry'

defineProps<{ items: CargoTypeItem[] }>()
>>>>>>> ini
const emit = defineEmits<{
  create: [body: Omit<CargoTypeItem, 'id'>]
  remove: [id: string]
}>()

<<<<<<< HEAD
const { page, pageSize, total, pagedItems, setPage, setPageSize } = usePagination(toRef(props, 'items'))

=======
>>>>>>> ini
const code = ref('CARGO-NEW')
const name = ref('高压电缆盘')
const length_m = ref(1.4)
const width_m = ref(1.2)
const height_m = ref(1.4)
const weight_kg = ref(1200)
const model_key = ref('cargo_reel')
const color_hex = ref('#ea580c')

function submit() {
  if (!code.value.trim() || !name.value.trim()) return
  emit('create', {
    code: code.value.trim(),
    name: name.value.trim(),
    length_m: length_m.value,
    width_m: width_m.value,
    height_m: height_m.value,
    weight_kg: weight_kg.value,
    model_key: model_key.value,
    color_hex: color_hex.value,
  })
}
</script>

<template>
  <div class="sub-card">
    <h4>2. 货品类型定义（含尺寸 / 单托重 / 预留 3D 模型）</h4>
    <div class="form-row">
      <input v-model="code" class="inp sm" placeholder="编码" />
      <input v-model="name" class="inp" placeholder="货品名称" />
      <input v-model.number="weight_kg" class="inp sm" type="number" placeholder="重量kg" />
      <select v-model="model_key" class="inp">
        <option v-for="m in CARGO_MODEL_OPTIONS" :key="m.key" :value="m.key">{{ m.label }}</option>
      </select>
      <button class="btn btn-primary" @click="submit">新增货品</button>
    </div>
<<<<<<< HEAD
    <div class="list-head"><span>已定义货品 <b>{{ total }}</b> 种</span></div>
    <div class="list">
      <div v-for="c in pagedItems" :key="c.id" class="row">
=======
    <div class="list">
      <div v-for="c in items" :key="c.id" class="row">
>>>>>>> ini
        <span class="dot" :style="{ background: c.color_hex }"></span>
        <strong>{{ c.code }}</strong>
        <span>{{ c.name }}</span>
        <span class="meta">{{ c.length_m }}×{{ c.width_m }}×{{ c.height_m }}m · {{ c.weight_kg }}kg · {{ c.model_key }}</span>
        <button class="btn btn-xs" @click="emit('remove', c.id)">删</button>
      </div>
<<<<<<< HEAD
      <p v-if="!total" class="empty">暂无货品类型，请先在上方新增</p>
    </div>
    <ListPagination
      :total="total" :page="page" :page-size="pageSize"
      @update:page="setPage" @update:page-size="setPageSize"
    />
=======
    </div>
>>>>>>> ini
  </div>
</template>

<style scoped>
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
h4 { margin: 0 0 10px; font-size: 13px; color: #f8fafc; }
.form-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; min-width: 110px; }
.sm { width: 82px; min-width: 82px; }
<<<<<<< HEAD
.list { display: flex; flex-direction: column; gap: 6px; min-height: 36px; }
.list-head { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.list-head b { color: #f8fafc; }
.empty { margin: 0; padding: 8px; font-size: 11px; color: #64748b; text-align: center; }
=======
.list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
>>>>>>> ini
.row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 8px; background: #1e293b; border-radius: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.meta { color: #94a3b8; margin-left: auto; }
.btn-xs { padding: 2px 6px; font-size: 11px; }
</style>
