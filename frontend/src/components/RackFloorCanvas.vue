<script setup lang="ts">
import { computed, ref } from 'vue'
<<<<<<< HEAD
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'
import { checkRackPlacementConflict, getRackFootprint, PLANT_L, PLANT_W } from '../utils/warehouseGeometry'

const props = defineProps<{ racks: RackLayoutItem[]; roads: RoadZoneItem[]; cargos: CargoTypeItem[]; selectedId: string }>()
=======
import type { RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'
import { checkRackPlacementConflict, getRackFootprint, PLANT_L, PLANT_W } from '../utils/warehouseGeometry'

const props = defineProps<{ racks: RackLayoutItem[]; roads: RoadZoneItem[]; selectedId: string }>()
>>>>>>> ini
const emit = defineEmits<{
  select: [id: string]
  move: [payload: { id: string; pos_x: number; pos_z: number; rotation_deg: 0 | 90 }]
  remove: [id: string]
}>()

const SCALE = 5
const dragState = ref<{ id: string; startX: number; startY: number; origX: number; origZ: number } | null>(null)
const previewPos = ref<{ id: string; pos_x: number; pos_z: number; conflict: string | null } | null>(null)
const selectedRack = computed(() => props.racks.find((r) => r.id === props.selectedId) ?? null)

<<<<<<< HEAD
const cargoMap = computed(() => new Map(props.cargos.map((c) => [c.code, c])))
const cargoOf = (r: RackLayoutItem) => (r.cargo_type_code ? cargoMap.value.get(r.cargo_type_code) ?? null : null)

const legend = computed(() => [
  ...props.cargos.map((c) => ({
    label: `${c.code} · ${c.name}`,
    color: c.color_hex,
    count: props.racks.filter((r) => r.cargo_type_code === c.code).length,
  })),
  { label: '未绑定货品', color: '', count: props.racks.filter((r) => !r.cargo_type_code).length },
])

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(96, 165, 250, ${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

=======
>>>>>>> ini
function snapHalf(v: number) { return Math.round(v * 2) / 2 }

function startDrag(e: PointerEvent, rack: RackLayoutItem) {
  emit('select', rack.id)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragState.value = { id: rack.id, startX: e.clientX, startY: e.clientY, origX: rack.pos_x, origZ: rack.pos_z }
  previewPos.value = { id: rack.id, pos_x: rack.pos_x, pos_z: rack.pos_z, conflict: null }
}

function onDrag(e: PointerEvent, rack: RackLayoutItem) {
  if (!dragState.value || dragState.value.id !== rack.id) return
  const pos_x = snapHalf(dragState.value.origX + (e.clientX - dragState.value.startX) / SCALE)
  const pos_z = snapHalf(dragState.value.origZ + (e.clientY - dragState.value.startY) / SCALE)
  const conflict = checkRackPlacementConflict({ ...rack, pos_x, pos_z }, props.racks, props.roads)
  previewPos.value = { id: rack.id, pos_x, pos_z, conflict }
}

function endDrag(rack: RackLayoutItem) {
  if (!dragState.value || dragState.value.id !== rack.id) return
  const pv = previewPos.value
  dragState.value = null
  previewPos.value = null
  if (pv && !pv.conflict && (pv.pos_x !== rack.pos_x || pv.pos_z !== rack.pos_z)) {
    emit('move', { id: rack.id, pos_x: pv.pos_x, pos_z: pv.pos_z, rotation_deg: rack.rotation_deg })
  }
}

function rotateSelected() {
  if (!selectedRack.value) return
  const nextRot: 0 | 90 = selectedRack.value.rotation_deg === 0 ? 90 : 0
  const conflict = checkRackPlacementConflict({ ...selectedRack.value, rotation_deg: nextRot }, props.racks, props.roads)
  if (!conflict) emit('move', { id: selectedRack.value.id, pos_x: selectedRack.value.pos_x, pos_z: selectedRack.value.pos_z, rotation_deg: nextRot })
}

<<<<<<< HEAD
function cargoStyle(r: RackLayoutItem) {
  const c = cargoOf(r)
  if (!c) return {}
  return { '--cargo-bg': hexToRgba(c.color_hex, 0.55), '--cargo-bd': c.color_hex }
}

=======
>>>>>>> ini
function rackStyle(r: RackLayoutItem) {
  const { spanX, spanZ } = getRackFootprint(r)
  const px = previewPos.value?.id === r.id ? previewPos.value.pos_x : r.pos_x
  const pz = previewPos.value?.id === r.id ? previewPos.value.pos_z : r.pos_z
  return {
    left: `${(px + PLANT_W / 2 - spanX / 2) * SCALE}px`,
    top: `${(pz + PLANT_L / 2 - spanZ / 2) * SCALE}px`,
    width: `${spanX * SCALE}px`,
    height: `${spanZ * SCALE}px`,
  }
}

function roadStyle(rd: RoadZoneItem) {
  return {
    left: `${(rd.pos_x + PLANT_W / 2 - rd.width_m / 2) * SCALE}px`,
    top: `${(rd.pos_z + PLANT_L / 2 - rd.length_m / 2) * SCALE}px`,
    width: `${rd.width_m * SCALE}px`,
    height: `${rd.length_m * SCALE}px`,
  }
}
</script>

<template>
  <div class="canvas-wrap">
    <div class="canvas-head">
      <span>3. 90m × 140m 平面拖拉拽摆放（空白区均为叉车可通行区 · 绿色道路固定禁区）</span>
      <div v-if="selectedRack" class="sel-actions">
<<<<<<< HEAD
        <span>选中：<b>{{ selectedRack.code }}</b> ({{ selectedRack.pos_x }}m, {{ selectedRack.pos_z }}m · {{ selectedRack.total_slots }}库位 · 承重{{ selectedRack.max_load_kg }}kg · 货品<template v-if="cargoOf(selectedRack)"><span class="cargo-tag" :style="{ background: cargoOf(selectedRack)!.color_hex }"></span>{{ cargoOf(selectedRack)!.name }}</template><template v-else>未绑定</template>)</span>
=======
        <span>选中：<b>{{ selectedRack.code }}</b> ({{ selectedRack.pos_x }}m, {{ selectedRack.pos_z }}m · {{ selectedRack.total_slots }}库位 · 承重{{ selectedRack.max_load_kg }}kg)</span>
>>>>>>> ini
        <button class="btn btn-xs" @click="rotateSelected">旋转 90°</button>
        <button class="btn btn-xs btn-danger" @click="emit('remove', selectedRack.id)">删除货架</button>
      </div>
    </div>
<<<<<<< HEAD
    <div class="legend">
      <span v-for="l in legend" :key="l.label" class="legend-item">
        <span class="dot" :class="{ unbound: !l.color }" :style="l.color ? { background: l.color } : {}"></span>
        {{ l.label }} × {{ l.count }}
      </span>
    </div>
=======
>>>>>>> ini
    <p v-if="previewPos?.conflict" class="conflict-tip">拦截：{{ previewPos.conflict }}</p>
    <div class="floor-scroll">
      <div class="floor" :style="{ width: `${PLANT_W * SCALE}px`, height: `${PLANT_L * SCALE}px` }">
        <div v-for="rd in roads" :key="rd.id" class="road-box" :style="roadStyle(rd)">{{ rd.code }}</div>
        <div
          v-for="r in racks"
          :key="r.id"
          class="rack-box"
<<<<<<< HEAD
          :class="{ active: r.id === selectedId, bad: previewPos?.id === r.id && !!previewPos.conflict, unbound: !cargoOf(r) }"
          :style="[rackStyle(r), cargoStyle(r)]"
          :title="cargoOf(r) ? `${r.code} · ${cargoOf(r)!.name}` : `${r.code} · 未绑定货品`"
=======
          :class="{ active: r.id === selectedId, bad: previewPos?.id === r.id && !!previewPos.conflict }"
          :style="rackStyle(r)"
>>>>>>> ini
          @pointerdown="startDrag($event, r)"
          @pointermove="onDrag($event, r)"
          @pointerup="endDrag(r)"
        >
          {{ r.code }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
.canvas-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; margin-bottom: 8px; }
.sel-actions { display: flex; align-items: center; gap: 8px; color: #38bdf8; }
.conflict-tip { margin: 0 0 6px; padding: 4px 8px; background: #7f1d1d; color: #fecaca; border-radius: 4px; font-size: 12px; }
.floor-scroll { overflow: auto; max-height: 740px; border: 1px solid #475569; border-radius: 6px; background: #020617; padding: 8px; }
.floor { position: relative; background: repeating-linear-gradient(0deg, #0f172a 0 19px, #1e293b 19px 20px), repeating-linear-gradient(90deg, #0f172a 0 19px, #1e293b 19px 20px); border: 2px solid #64748b; user-select: none; }
.road-box { position: absolute; background: rgba(16, 185, 129, 0.22); border: 1px dashed #10b981; color: #6ee7b7; font-size: 10px; display: flex; align-items: center; justify-content: center; pointer-events: none; }
<<<<<<< HEAD
.rack-box { position: absolute; background: var(--cargo-bg, rgba(59, 130, 246, 0.55)); border: 1px solid var(--cargo-bd, #60a5fa); color: #f8fafc; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; border-radius: 2px; }
.rack-box.unbound { border-style: dashed; }
.rack-box.active { border: 2px solid #facc15; background: rgba(234, 179, 8, 0.45); }
.rack-box.bad { border-color: #ef4444; background: rgba(239, 68, 68, 0.65); }
.legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot.unbound { border: 1px dashed #64748b; }
.cargo-tag { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 3px; vertical-align: middle; }
=======
.rack-box { position: absolute; background: rgba(59, 130, 246, 0.55); border: 1px solid #60a5fa; color: #f8fafc; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; border-radius: 2px; }
.rack-box.active { border: 2px solid #facc15; background: rgba(234, 179, 8, 0.45); }
.rack-box.bad { border-color: #ef4444; background: rgba(239, 68, 68, 0.65); }
>>>>>>> ini
.btn-xs { padding: 2px 8px; font-size: 11px; }
.btn-danger { background: #7f1d1d; border-color: #991b1b; }
</style>
