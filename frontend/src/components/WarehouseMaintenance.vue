<script setup lang="ts">
<<<<<<< HEAD
import { computed, onMounted, ref } from 'vue'
import {
  createCargoType, createRack, createRoad, deleteCargoType, deleteRack, deleteRoad,
  listCargoTypes, listRacks, listRoads, listSlots, randomizeLayout, syncRackSlots, updateRack, updateSlot,
  type RackUpdateBody, type CargoTypeItem, type RackLayoutItem, type RoadZoneItem, type SlotItem, type SlotUpdateBody,
} from '../api/client'
import { checkRackPlacementConflict, RACK_MODEL_OPTIONS } from '../utils/warehouseGeometry'
import CargoTypePanel from './CargoTypePanel.vue'
import RackEditModal from './RackEditModal.vue'
import RackFloorCanvas from './RackFloorCanvas.vue'
import RackListPanel from './RackListPanel.vue'
import RoadZonePanel from './RoadZonePanel.vue'
import SlotLedgerPanel from './SlotLedgerPanel.vue'
=======
import { onMounted, ref } from 'vue'
import {
  createCargoType, createRack, createRoad, deleteCargoType, deleteRack, deleteRoad,
  listCargoTypes, listRacks, listRoads, seedDemoWarehouse, updateRackPosition,
  type CargoTypeItem, type RackLayoutItem, type RoadZoneItem,
} from '../api/client'
import { checkRackPlacementConflict, RACK_MODEL_OPTIONS } from '../utils/warehouseGeometry'
import CargoTypePanel from './CargoTypePanel.vue'
import RackFloorCanvas from './RackFloorCanvas.vue'
import RoadZonePanel from './RoadZonePanel.vue'
>>>>>>> ini

const props = defineProps<{ token: string }>()
const cargos = ref<CargoTypeItem[]>([])
const racks = ref<RackLayoutItem[]>([])
const roads = ref<RoadZoneItem[]>([])
<<<<<<< HEAD
const slots = ref<SlotItem[]>([])
const selectedId = ref('')
const err = ref('')
const msg = ref('')
const syncingSlots = ref(false)
const selectedRack = computed(() => racks.value.find((r) => r.id === selectedId.value) ?? null)
const selectedSlots = computed(() => slots.value.filter((s) => s.rack_id === selectedId.value))
=======
const selectedId = ref('')
const err = ref('')
const msg = ref('')
>>>>>>> ini

const rCode = ref('RK-A01')
const rName = ref('重型货架A1')
const rLen = ref(12)
const rWid = ref(1.6)
const rHei = ref(6.8)
const rBays = ref(3)
const rLevels = ref(4)
const rSlots = ref(2)
const rLoad = ref(2000)
const rPosX = ref(-18)
const rPosZ = ref(0)
const rModel = ref('rack_heavy_4l')
const rCargo = ref('CARGO-BOX')

async function refreshAll() {
  err.value = ''
  try {
<<<<<<< HEAD
    const [c, rk, rd, sl] = await Promise.all([listCargoTypes(props.token), listRacks(props.token), listRoads(props.token), listSlots(props.token)])
    cargos.value = c; racks.value = rk; roads.value = rd; slots.value = sl
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleRandomizeLayout() {
  err.value = ''; msg.value = ''
  try {
    const res = await randomizeLayout(props.token)
    msg.value = `已随机生成 ${res.racks} 排货架、${res.roads} 条通道；货位占用 ${res.occupied_slots}/${res.total_slots}`
    selectedId.value = ''
=======
    const [c, rk, rd] = await Promise.all([listCargoTypes(props.token), listRacks(props.token), listRoads(props.token)])
    cargos.value = c; racks.value = rk; roads.value = rd
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleSeedDemo() {
  err.value = ''; msg.value = ''
  try {
    const res = await seedDemoWarehouse(props.token)
    msg.value = `已幂等导入：本次新增 ${res.seeded_racks} 排，当前共 ${res.total_racks} 排货架（切回「3D 厂区孪生」可实时查看）`
>>>>>>> ini
    await refreshAll()
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
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
  try {
    const created = await createRack(props.token, body)
    selectedId.value = created.id
    await refreshAll()
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleMoveRack(p: { id: string; pos_x: number; pos_z: number; rotation_deg: 0 | 90 }) {
<<<<<<< HEAD
  try { await updateRack(props.token, p.id, p); await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

function handleSelectRack(id: string) { selectedId.value = id }

const editingRack = ref<RackLayoutItem | null>(null)
function handleEditRack(rack: RackLayoutItem) { editingRack.value = rack }

async function handleSaveRackEdit(body: RackUpdateBody) {
  if (!editingRack.value) return
  const geoKeys: (keyof RackUpdateBody)[] = ['pos_x', 'pos_z', 'rotation_deg', 'length_m', 'width_m']
  const geometryChanged = geoKeys.some((k) => body[k] !== undefined)
  if (geometryChanged) {
    const merged = { ...editingRack.value, ...body }
    const conflict = checkRackPlacementConflict(merged, racks.value, roads.value)
    if (conflict) { err.value = `保存拦截：${conflict}`; return }
  }
  const id = editingRack.value.id
  await withRefresh(async () => { await updateRack(props.token, id, body); editingRack.value = null })
}

async function withRefresh(action: () => Promise<unknown>) {
  err.value = ''
  try { await action(); await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

const handleDeleteRack = (id: string) => withRefresh(() => deleteRack(props.token, id))
const handleCreateCargo = (b: Omit<CargoTypeItem, 'id'>) => withRefresh(() => createCargoType(props.token, b))
const handleDeleteCargo = (id: string) => withRefresh(() => deleteCargoType(props.token, id))
const handleCreateRoad = (b: Omit<RoadZoneItem, 'id' | 'is_locked'>) => withRefresh(() => createRoad(props.token, b))
const handleDeleteRoad = (id: string) => withRefresh(() => deleteRoad(props.token, id))
const handleUpdateSlot = (slotId: string, body: SlotUpdateBody) => withRefresh(() => updateSlot(props.token, slotId, body))

async function handleSyncSlots(rackId: string) {
  err.value = ''; msg.value = ''; syncingSlots.value = true
  try {
    const res = await syncRackSlots(props.token, rackId)
    msg.value = `货位同步完成：新增 ${res.created} 个，回收 ${res.removed} 个，当前 ${res.total} 个`
    await refreshAll()
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) } finally { syncingSlots.value = false }
}

=======
  try { await updateRackPosition(props.token, p.id, p.pos_x, p.pos_z, p.rotation_deg); await refreshAll() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

>>>>>>> ini
onMounted(refreshAll)
</script>

<template>
  <div class="wh-shell">
    <div class="sub-card">
      <div class="head-row">
        <h4>1. 货架生成（尺寸 / 库位 / 单层承重 / 预留 3D 模型）</h4>
        <div class="head-actions">
<<<<<<< HEAD
          <button class="btn btn-primary" @click="handleRandomizeLayout">随机重排布局</button>
=======
          <button class="btn btn-primary" @click="handleSeedDemo">一键导入默认布局 (8排/1152库位)</button>
>>>>>>> ini
          <button class="btn" @click="refreshAll">刷新同步</button>
        </div>
      </div>
      <div class="form-row">
        <input v-model="rCode" class="inp sm" placeholder="编码" />
        <input v-model="rName" class="inp" placeholder="货架名称" />
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
      <p v-if="msg" class="ok-box">{{ msg }}</p>
      <p v-if="err" class="err-box">{{ err }}</p>
    </div>

    <div class="split">
<<<<<<< HEAD
      <RackFloorCanvas
        :racks="racks" :roads="roads" :cargos="cargos" :selected-id="selectedId"
        @select="handleSelectRack" @move="handleMoveRack" @remove="handleDeleteRack"
      />
      <div class="side-col">
        <CargoTypePanel :items="cargos" @create="handleCreateCargo" @remove="handleDeleteCargo" />
        <RoadZonePanel :items="roads" @create="handleCreateRoad" @remove="handleDeleteRoad" />
      </div>
    </div>

    <SlotLedgerPanel
      v-if="selectedRack"
      :rack="selectedRack" :slots="selectedSlots" :cargos="cargos" :syncing="syncingSlots"
      @sync="handleSyncSlots" @update="handleUpdateSlot"
    />

    <RackListPanel
      :items="racks" :cargos="cargos" :selected-id="selectedId"
      @select="handleSelectRack" @edit="handleEditRack" @remove="handleDeleteRack"
    />

    <RackEditModal
      v-if="editingRack" :rack="editingRack" :cargos="cargos"
      @close="editingRack = null" @save="handleSaveRackEdit"
    />
=======
      <RackFloorCanvas :racks="racks" :roads="roads" :selected-id="selectedId" @select="(id) => (selectedId = id)" @move="handleMoveRack" @remove="async (id) => { await deleteRack(props.token, id); await refreshAll() }" />
      <div class="side-col">
        <CargoTypePanel :items="cargos" @create="async (b) => { await createCargoType(props.token, b); await refreshAll() }" @remove="async (id) => { await deleteCargoType(props.token, id); await refreshAll() }" />
        <RoadZonePanel :items="roads" @create="async (b) => { await createRoad(props.token, b); await refreshAll() }" @remove="async (id) => { await deleteRoad(props.token, id); await refreshAll() }" />
      </div>
    </div>
>>>>>>> ini
  </div>
</template>

<style scoped>
.wh-shell { display: flex; flex-direction: column; gap: 12px; color: #e2e8f0; }
.sub-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
.head-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
.head-actions { display: flex; gap: 8px; }
h4 { margin: 0; font-size: 13px; color: #f8fafc; }
.form-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lbl { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 12px; }
.sm { width: 78px; }
.xs { width: 48px; }
.ok-box { margin: 8px 0 0; padding: 6px 10px; border-radius: 6px; background: #064e3b; color: #a7f3d0; font-size: 12px; }
.err-box { margin: 8px 0 0; padding: 6px 10px; border-radius: 6px; background: #450a0a; color: #fecaca; font-size: 12px; }
.split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; align-items: start; }
.side-col { display: flex; flex-direction: column; gap: 12px; }
</style>
