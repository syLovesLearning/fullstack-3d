<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import {
  batchSlots, createCargoType, createRack, createRoad, deleteCargoType, deleteRack, deleteRoad,
  listCargoTypes, listRacks, listRoads, listSlots, seedDemoWarehouse, updateRackMeta, updateRackPosition,
  type AbcClass, type CargoTypeItem, type RackLayoutItem, type RoadZoneItem, type SlotType, type WarehouseSlotItem,
} from '../api/client'
import { checkRackPlacementConflict, RACK_MODEL_OPTIONS } from '../utils/warehouseGeometry'
import CampusMaintenance from './CampusMaintenance.vue'
import CargoTypePanel from './CargoTypePanel.vue'
import RackCrudPanel from './RackCrudPanel.vue'
import RackFloorCanvas from './RackFloorCanvas.vue'
import RackMetaModal from './RackMetaModal.vue'
import RoadZonePanel from './RoadZonePanel.vue'
import SlotMaintenanceView from './SlotMaintenanceView.vue'

const props = defineProps<{ token: string; focusRackId?: string }>()
const subTab = ref<'campus' | 'layout' | 'slots'>('layout')
const cargos = ref<CargoTypeItem[]>([])
const racks = ref<RackLayoutItem[]>([])
const roads = ref<RoadZoneItem[]>([])
const slots = ref<WarehouseSlotItem[]>([])
const selectedId = ref('')
const selectedRoadId = ref('')
const editingRack = ref<RackLayoutItem | null>(null)
const err = ref(''), msg = ref('')

const rCode = ref('RK-A01'), rName = ref('重型货架A1'), rLen = ref(12), rWid = ref(1.6), rHei = ref(6.8)
const rBays = ref(3), rLevels = ref(4), rSlots = ref(2), rLoad = ref(2000), rPosX = ref(-18), rPosZ = ref(0)
const rModel = ref('rack_heavy_4l'), rCargo = ref('CARGO-BOX')

watch(() => props.focusRackId, (fid) => { if (fid) { subTab.value = 'slots'; selectedId.value = fid } })

async function refreshAll() {
  err.value = ''
  try {
    const [c, rk, rd, sl] = await Promise.all([listCargoTypes(props.token), listRacks(props.token), listRoads(props.token), listSlots(props.token)])
    cargos.value = c; racks.value = rk; roads.value = rd; slots.value = sl
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleSeedDemo() {
  err.value = ''; msg.value = ''
  try { const res = await seedDemoWarehouse(props.token); msg.value = `已幂等导入：新增 ${res.seeded_racks} 排，共 ${res.total_racks} 排货架`; await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleCreateRack() {
  err.value = ''; msg.value = ''
  const body: Omit<RackLayoutItem, 'id' | 'total_slots'> = {
    code: rCode.value.trim(), name: rName.value.trim(), length_m: rLen.value, width_m: rWid.value, height_m: rHei.value,
    bays: rBays.value, levels: rLevels.value, slots_per_bay: rSlots.value, max_load_kg: rLoad.value,
    pos_x: rPosX.value, pos_z: rPosZ.value, rotation_deg: 0, model_key: rModel.value, cargo_type_code: rCargo.value || null,
  }
  const conflict = checkRackPlacementConflict(body, racks.value, roads.value)
  if (conflict) { err.value = `生成拦截：${conflict}`; return }
  try { selectedId.value = (await createRack(props.token, body)).id; await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleMoveRack(p: { id: string; pos_x: number; pos_z: number; rotation_deg: 0 | 90 }) {
  try { await updateRackPosition(props.token, p.id, p.pos_x, p.pos_z, p.rotation_deg); await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleRotateRack(r: RackLayoutItem) {
  const nextRot: 0 | 90 = r.rotation_deg === 0 ? 90 : 0
  const conflict = checkRackPlacementConflict({ ...r, rotation_deg: nextRot }, racks.value, roads.value)
  if (conflict) { err.value = `旋转拦截：${conflict}`; return }
  await handleMoveRack({ id: r.id, pos_x: r.pos_x, pos_z: r.pos_z, rotation_deg: nextRot })
}

async function handleSaveRackMeta(p: { id: string; name: string; max_load_kg: number; cargo_type_code: string | null }) {
  await updateRackMeta(props.token, p.id, p.name, p.max_load_kg, p.cargo_type_code); editingRack.value = null; await refreshAll()
}

async function handleBatchRack(p: { rack_id: string; action: 'lock' | 'unlock' | 'disable' | 'set_abc' | 'set_type'; abc_class?: AbcClass; slot_type?: SlotType }) {
  await batchSlots(props.token, p); await refreshAll()
}

onMounted(refreshAll)
</script>

<template>
  <div class="wh-shell">
    <div class="sub-nav">
      <div class="sub-tabs">
        <button class="btn" :class="{ 'btn-primary': subTab === 'campus' }" @click="subTab = 'campus'">厂区维护（位置 + 道路）</button>
        <button class="btn" :class="{ 'btn-primary': subTab === 'layout' }" @click="subTab = 'layout'">货架平面维护与字典（CRUD + 拖拽）</button>
        <button class="btn" :class="{ 'btn-primary': subTab === 'slots' }" @click="subTab = 'slots'">库位主数据维护（正面图 + 台账）</button>
      </div>
      <div class="head-actions">
        <button class="btn btn-primary" @click="handleSeedDemo">一键导入默认布局 (8排/1152库位)</button>
        <button class="btn" @click="refreshAll">刷新同步</button>
      </div>
    </div>

    <p v-if="msg" class="ok-box">{{ msg }}</p><p v-if="err" class="err-box">{{ err }}</p>

    <CampusMaintenance v-if="subTab === 'campus'" :token="token" />

    <template v-else-if="subTab === 'layout'">
      <div class="sub-card">
        <h4>1. 货架生成（尺寸 / 库位 / 单层承重 / 预留 3D 模型）</h4>
        <div class="form-row">
          <input v-model="rCode" class="inp sm" placeholder="编码" /><input v-model="rName" class="inp" placeholder="货架名称" />
          <label class="lbl">长 <input v-model.number="rLen" class="inp xs" type="number" /></label>
          <label class="lbl">宽 <input v-model.number="rWid" class="inp xs" type="number" /></label>
          <label class="lbl">高 <input v-model.number="rHei" class="inp xs" type="number" /></label>
          <label class="lbl">跨×层×位 <input v-model.number="rBays" class="inp xs" type="number" />×<input v-model.number="rLevels" class="inp xs" type="number" />×<input v-model.number="rSlots" class="inp xs" type="number" /></label>
          <label class="lbl">承重kg <input v-model.number="rLoad" class="inp sm" type="number" /></label>
          <label class="lbl">X <input v-model.number="rPosX" class="inp xs" type="number" /></label>
          <label class="lbl">Z <input v-model.number="rPosZ" class="inp xs" type="number" /></label>
          <select v-model="rModel" class="inp"><option v-for="m in RACK_MODEL_OPTIONS" :key="m.key" :value="m.key">{{ m.label }}</option></select>
          <select v-model="rCargo" class="inp"><option v-for="c in cargos" :key="c.code" :value="c.code">{{ c.name }}</option></select>
          <button class="btn btn-primary" @click="handleCreateRack">生成货架</button>
        </div>
      </div>

      <div class="split">
        <RackFloorCanvas :racks="racks" :roads="roads" :selected-id="selectedId" :selected-road-id="selectedRoadId" @select="(id) => (selectedId = id)" @select-road="(id) => (selectedRoadId = id)" @edit-rack="(r) => (editingRack = r)" @move="handleMoveRack" @remove="async (id) => { await deleteRack(props.token, id); await refreshAll() }" @remove-road="async (id) => { await deleteRoad(props.token, id); selectedRoadId = ''; await refreshAll() }" />
        <div class="side-col">
          <RackCrudPanel :items="racks" :selected-id="selectedId" @select="(id) => { selectedId = id; selectedRoadId = '' }" @edit-meta="(r) => (editingRack = r)" @rotate="handleRotateRack" @go-slots="(id) => { selectedId = id; subTab = 'slots' }" @remove="async (id) => { await deleteRack(props.token, id); await refreshAll() }" />
          <RoadZonePanel :items="roads" :selected-road-id="selectedRoadId" @select="(id) => { selectedRoadId = id; selectedId = '' }" @create="async (b) => { await createRoad(props.token, b); await refreshAll() }" @remove="async (id) => { await deleteRoad(props.token, id); await refreshAll() }" />
          <CargoTypePanel :items="cargos" @create="async (b) => { await createCargoType(props.token, b); await refreshAll() }" @remove="async (id) => { await deleteCargoType(props.token, id); await refreshAll() }" />
        </div>
      </div>
      <RackMetaModal :rack="editingRack" :cargos="cargos" err-msg="" @close="editingRack = null" @save-meta="handleSaveRackMeta" @batch-rack="handleBatchRack" />
    </template>

    <SlotMaintenanceView v-else :token="token" :racks="racks" :slots="slots" :cargos="cargos" :focus-rack-id="selectedId || focusRackId || ''" @refresh="refreshAll" />
  </div>
</template>

<style scoped>
.wh-shell { display: flex; flex-direction: column; gap: 12px; color: #e2e8f0; }
.sub-nav { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; }
.sub-tabs, .head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.sub-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
h4 { margin: 0 0 8px; font-size: 13px; color: #f8fafc; }
.form-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lbl { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 12px; }
.sm { width: 78px; } .xs { width: 48px; }
.ok-box { margin: 0; padding: 6px 10px; border-radius: 6px; background: #064e3b; color: #a7f3d0; font-size: 12px; }
.err-box { margin: 0; padding: 6px 10px; border-radius: 6px; background: #450a0a; color: #fecaca; font-size: 12px; }
.split { display: grid; grid-template-columns: 1.15fr 1fr; gap: 12px; align-items: start; }
.side-col { display: flex; flex-direction: column; gap: 12px; }
</style>
