<script setup lang="ts">
<<<<<<< HEAD
import { computed, onMounted, ref, watch } from 'vue'
import { listCargoTypes, listRacks, listRoads, listSlots } from '../api/client'
import { useFactoryScene, type CamPreset } from '../composables/useFactoryScene'
import { useForkliftMoveDemo } from '../composables/useForkliftMoveDemo'
import type { CargoTypeItem, RackLayoutItem, SlotItem } from '../api/warehouseTypes'

const props = defineProps<{ token: string; active: boolean }>()
const boxEl = ref<HTMLElement | null>(null)
const {
  stats, fps, drawCalls, triangles, matCount, rackCount, slotCount, occupiedCount, equipmentCount,
  selectedRack, setCam, syncWarehouse3D, clearSelection, startForkliftDemo, stopForkliftDemo,
} = useFactoryScene(boxEl)
const syncing = ref(false)
const cargoTypes = ref<CargoTypeItem[]>([])
const slots = ref<SlotItem[]>([])
const racks = ref<RackLayoutItem[]>([])

const selectedCargo = computed(() => {
  const code = selectedRack.value?.cargo_type_code
  return code ? cargoTypes.value.find((c) => c.code === code) ?? null : null
})

const selectedOccupancy = computed(() => {
  const id = selectedRack.value?.id
  if (!id) return null
  const list = slots.value.filter((s) => s.rack_id === id)
  return { occupied: list.filter((s) => s.status === 'occupied').length, total: list.length || selectedRack.value?.total_slots || 0 }
})
=======
import { onMounted, ref, watch } from 'vue'
import { listCargoTypes, listRacks, listRoads } from '../api/client'
import { useFactoryScene, type CamPreset } from '../composables/useFactoryScene'

const props = defineProps<{ token: string; active: boolean }>()
const boxEl = ref<HTMLElement | null>(null)
const { stats, fps, drawCalls, triangles, matCount, rackCount, slotCount, setCam, syncWarehouse3D } = useFactoryScene(boxEl)
const syncing = ref(false)
>>>>>>> ini

const presets: { key: CamPreset; label: string }[] = [
  { key: 'aisle', label: '通道内视角' },
  { key: 'bird', label: '厂区全景俯瞰' },
  { key: 'rail', label: '预留轨道特写' },
  { key: 'ebox', label: '角落配电箱' },
  { key: 'fork', label: '叉车与托盘区' },
<<<<<<< HEAD
  { key: 'equip', label: '设备区巡视' },
=======
>>>>>>> ini
]

async function reload3DData() {
  if (!props.token) return
  syncing.value = true
  try {
<<<<<<< HEAD
    const [rackRows, roads, cargos, slotRows] = await Promise.all([
      listRacks(props.token),
      listRoads(props.token),
      listCargoTypes(props.token),
      listSlots(props.token),
    ])
    cargoTypes.value = cargos
    slots.value = slotRows
    racks.value = rackRows
    syncWarehouse3D(rackRows, roads, cargos, slotRows)
=======
    const [racks, roads, cargos] = await Promise.all([
      listRacks(props.token),
      listRoads(props.token),
      listCargoTypes(props.token),
    ])
    syncWarehouse3D(racks, roads, cargos)
>>>>>>> ini
  } finally {
    syncing.value = false
  }
}

<<<<<<< HEAD
const { demoStatus, demoRunning, startDemo, stopDemo } = useForkliftMoveDemo({
  token: () => props.token,
  slots, racks, selectedRack,
  start: startForkliftDemo,
  stop: stopForkliftDemo,
  reload: reload3DData,
})

=======
>>>>>>> ini
watch(() => props.active, (isActive) => {
  if (isActive) reload3DData()
})

onMounted(reload3DData)
</script>

<template>
  <div class="twin-wrap">
    <div class="twin-bar">
      <div>
        <strong>90m × 140m 工业厂区数字孪生</strong>
        <span v-if="stats" class="meta">
<<<<<<< HEAD
          实时货架 {{ rackCount }} 排 · 总库位 {{ slotCount }} 个 · 已占 {{ occupiedCount }} 个 · 设备 {{ equipmentCount }} 台 · 轨面标高 {{ stats.railHeightM }}m · 点击 3D 货架查看属性
=======
          实时货架 {{ rackCount }} 排 · 总库位 {{ slotCount }} 个 · 轨面标高 {{ stats.railHeightM }}m
>>>>>>> ini
        </span>
      </div>
      <div class="btns">
        <button class="btn btn-primary" :disabled="syncing" @click="reload3DData">
          {{ syncing ? '同步中...' : '刷新 3D 数据' }}
        </button>
<<<<<<< HEAD
        <button class="btn demo-btn" :disabled="!slots.length" @click="startDemo">搬运演示</button>
        <button v-if="demoRunning" class="btn" @click="stopDemo">停止</button>
=======
>>>>>>> ini
        <button v-for="p in presets" :key="p.key" class="btn" @click="setCam(p.key)">{{ p.label }}</button>
      </div>
    </div>

    <div class="hud">
      <span>FPS: <b>{{ fps }}</b></span>
      <span>DrawCalls: <b>{{ drawCalls }}</b></span>
      <span>面数: <b>{{ triangles.toLocaleString() }}</b></span>
      <span>共享材质池: <b>{{ matCount }} 个</b></span>
<<<<<<< HEAD
      <span v-if="demoStatus" class="demo-status">{{ demoStatus }}</span>
    </div>

    <div ref="boxEl" class="stage">
      <div v-if="selectedRack" class="rack-panel">
        <div class="rp-head">
          <b>{{ selectedRack.code }}</b>
          <span class="rp-name">{{ selectedRack.name }}</span>
          <button class="rp-close" @click="clearSelection">×</button>
        </div>
        <table class="rp-table">
          <tbody>
            <tr><td>总库位数</td><td>{{ selectedRack.total_slots }}</td></tr>
            <tr v-if="selectedOccupancy"><td>库位占用</td><td>{{ selectedOccupancy.occupied }} / {{ selectedOccupancy.total }}</td></tr>
            <tr><td>最大承重</td><td>{{ selectedRack.max_load_kg.toLocaleString() }} kg</td></tr>
            <tr><td>货品类型</td><td>{{ selectedCargo ? `${selectedCargo.code} · ${selectedCargo.name}` : '未绑定' }}</td></tr>
            <tr><td>规格 (长×宽×高)</td><td>{{ selectedRack.length_m }}m × {{ selectedRack.width_m }}m × {{ selectedRack.height_m }}m</td></tr>
            <tr><td>层数 / 货格</td><td>{{ selectedRack.levels }} 层 · {{ selectedRack.bays }} 货格 × {{ selectedRack.slots_per_bay }} 位</td></tr>
            <tr><td>摆放角度</td><td>{{ selectedRack.rotation_deg }}° @ ({{ selectedRack.pos_x }}, {{ selectedRack.pos_z }})</td></tr>
          </tbody>
        </table>
      </div>
    </div>
=======
    </div>

    <div ref="boxEl" class="stage"></div>
>>>>>>> ini
  </div>
</template>

<style scoped>
.twin-wrap { display: flex; flex-direction: column; height: calc(100vh - 58px); background: #dbeafe; }
.twin-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #0f172a; color: #f8fafc; border-bottom: 1px solid #334155; gap: 12px; flex-wrap: wrap; }
.meta { margin-left: 12px; font-size: 12px; color: #94a3b8; }
.btns { display: flex; gap: 6px; flex-wrap: wrap; }
<<<<<<< HEAD
.demo-btn { background: #b45309; border-color: #d97706; }
.demo-status { margin-left: auto; color: #fbbf24; }
.hud { display: flex; gap: 18px; padding: 6px 16px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 12px; color: #cbd5e1; }
.hud b { color: #34d399; }
.stage { flex: 1; min-height: 0; position: relative; }

.rack-panel {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 260px;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 10;
}
.rp-head { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
.rp-head b { color: #fbbf24; }
.rp-name { flex: 1; font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-close { border: none; background: transparent; color: #cbd5e1; font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px; }
.rp-close:hover { color: #f87171; }
.rp-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
.rp-table td { padding: 4px 0; color: #cbd5e1; }
.rp-table td:first-child { color: #94a3b8; width: 92px; }
.rp-table td:last-child { color: #f1f5f9; text-align: right; }
=======
.hud { display: flex; gap: 18px; padding: 6px 16px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 12px; color: #cbd5e1; }
.hud b { color: #34d399; }
.stage { flex: 1; min-height: 0; }
>>>>>>> ini
</style>
