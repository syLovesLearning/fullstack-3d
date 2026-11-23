<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CampusDoor, CampusRoadItem, CampusZoneItem } from '../api/warehouseTypes'
import { computeCampusTransform, drawCampusScene } from '../utils/campusCanvasDraw'
import { checkCampusZoneConflict, doorWorldPos, rebuildGreenRoadNetwork } from '../utils/campusRoadGraph'
import type { CampusSimState } from '../utils/campusSimEngine'

const props = defineProps<{ zones: CampusZoneItem[]; roads: CampusRoadItem[]; selectedZoneId: string; selectedRoadId: string }>()
const emit = defineEmits<{
  selectZone: [id: string]
  selectRoad: [id: string]
  moveZone: [payload: { id: string; x: number; y: number }]
  toggleDoor: [payload: { id: string; doors: CampusDoor[] }]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const previewPos = ref<{ id: string; x: number; y: number; conflict: string | null } | null>(null)
let drag: { id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null = null
let ro: ResizeObserver | null = null

function render() {
  const c = canvasEl.value
  if (!c || !c.parentElement) return
  const r = c.parentElement.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = r.width * dpr; c.height = r.height * dpr
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const renderZones = props.zones.map((z) =>
    previewPos.value?.id === z.id ? { ...z, x: previewPos.value.x, y: previewPos.value.y } : z,
  )
  const { greenRoads, nodes } = rebuildGreenRoadNetwork(renderZones, props.roads)
  const state: CampusSimState = {
    zones: renderZones, greenRoads, nodes, subZones: [], flows: [], events: [], forklifts: [], trucks: [],
    simTime: 0, truckAcc: 0, completedCount: 0, totalElapsedSum: 0, nextFlowId: 1, nextForkId: 1, nextTruckId: 1, totalEventCount: 0,
  }
  drawCampusScene(ctx, r.width, r.height, state, {
    selectedZoneId: props.selectedZoneId,
    selectedRoadId: props.selectedRoadId,
    conflictZoneId: previewPos.value?.conflict ? previewPos.value.id : undefined,
    simMode: false,
  })
}

function getMeterPos(e: PointerEvent) {
  const c = canvasEl.value!
  const rect = c.getBoundingClientRect()
  const px = e.clientX - rect.left, py = e.clientY - rect.top
  const { viewScale, padX, padY } = computeCampusTransform(rect.width, rect.height)
  return { px, py, mx: (px - padX) / viewScale, my: (py - padY) / viewScale, viewScale, padX, padY }
}

function onPointerDown(e: PointerEvent) {
  const { px, py, mx, my, viewScale, padX, padY } = getMeterPos(e)
  for (const z of props.zones) {
    for (const d of z.doors) {
      const dp = doorWorldPos(z, d)
      if (Math.hypot(px - (padX + dp.x * viewScale), py - (padY + dp.y * viewScale)) <= 10) {
        const nextDoors = z.doors.map((item) => (item.id === d.id ? { ...item, open: !item.open } : item))
        emit('selectZone', z.id)
        emit('toggleDoor', { id: z.id, doors: nextDoors })
        return
      }
    }
  }
  const hitZ = props.zones.find((z) => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h)
  if (hitZ) {
    emit('selectZone', hitZ.id); emit('selectRoad', '')
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag = { id: hitZ.id, startX: e.clientX, startY: e.clientY, origX: hitZ.x, origY: hitZ.y, moved: false }
    previewPos.value = { id: hitZ.id, x: hitZ.x, y: hitZ.y, conflict: null }
    return
  }
  const hitR = props.roads.find((r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
  if (hitR) { emit('selectRoad', hitR.id); emit('selectZone', '') }
}

function onPointerMove(e: PointerEvent) {
  if (!drag || !canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const { viewScale } = computeCampusTransform(rect.width, rect.height)
  const z = props.zones.find((item) => item.id === drag!.id)
  if (!z) return
  const dx = (e.clientX - drag.startX) / viewScale, dy = (e.clientY - drag.startY) / viewScale
  if (Math.hypot(dx, dy) > 0.8) drag.moved = true
  const nx = Math.round(drag.origX + dx), ny = Math.round(drag.origY + dy)
  const conflict = checkCampusZoneConflict({ id: z.id, x: nx, y: ny, w: z.w, h: z.h }, props.zones, props.roads)
  previewPos.value = { id: z.id, x: nx, y: ny, conflict }
  render()
}

function onPointerUp() {
  if (!drag) return
  const pv = previewPos.value
  const moved = drag.moved
  drag = null
  previewPos.value = null
  render()
  if (pv && moved && !pv.conflict) emit('moveZone', { id: pv.id, x: pv.x, y: pv.y })
}

watch(() => [props.zones, props.roads, props.selectedZoneId, props.selectedRoadId], render, { deep: true })
onMounted(() => {
  ro = new ResizeObserver(render)
  if (canvasEl.value?.parentElement) ro.observe(canvasEl.value.parentElement)
  render()
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div class="campus-canvas-box">
    <div class="canvas-tip">
      <span>680m × 420m 园区平面（拖拽厂房调整位置 · 点击墙门开关支路 · 点击道路联动右侧）</span>
      <span v-if="previewPos?.conflict" class="conflict-tag">拦截：{{ previewPos.conflict }}</span>
    </div>
    <div class="canvas-stage">
      <canvas ref="canvasEl" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" />
    </div>
  </div>
</template>

<style scoped>
.campus-canvas-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.canvas-tip { font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.conflict-tag { padding: 2px 8px; border-radius: 4px; background: #7f1d1d; color: #fecaca; font-weight: 600; font-size: 11px; }
.canvas-stage { position: relative; width: 100%; height: 480px; background: #020617; border-radius: 6px; overflow: hidden; }
canvas { display: block; width: 100%; height: 100%; cursor: grab; }
</style>
