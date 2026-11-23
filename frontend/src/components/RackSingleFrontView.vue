<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AbcClass, RackLayoutItem, SlotType, WarehouseSlotItem } from '../api/warehouseTypes'
import { renderSingleRackLocations3D } from '../utils/dynamicWarehouse3D'
import { MaterialPool } from '../utils/materialPool'
import RackFront2D from './RackFront2D.vue'

const props = defineProps<{
  rack: RackLayoutItem | null
  slots: WarehouseSlotItem[]
  focusBay: number | null
}>()

const emit = defineEmits<{
  openDetail: [slot: WarehouseSlotItem]
  openLevel: [payload: { rack: RackLayoutItem; bayIdx: number; levelIdx?: number }]
  openRack: [rack: RackLayoutItem]
  merge: [slotId: string]
  split: [slotId: string]
  quickPatch: [payload: { id: string; status: 'available' | 'locked' | 'disabled'; slot_type: SlotType; abc_class: AbcClass; allow_mixed: boolean; max_weight_kg: number; remark: string }]
}>()

const viewType = ref<'2d' | '3d'>('2d')
const boxEl = ref<HTMLElement | null>(null)
const lockFront = ref(true)
const pool = new MaterialPool()
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, ctrl: OrbitControls
let rackGroup: THREE.Group, ro: ResizeObserver | null = null, rafId = 0

function renderSingleRack() {
  if (!rackGroup || !props.rack || !camera || !ctrl) return
  const centeredRack: RackLayoutItem = { ...props.rack, pos_x: 0, pos_z: 0, rotation_deg: 0 }
  const rSlots = props.slots.filter((s) => s.rack_id === props.rack!.id)
  renderSingleRackLocations3D(rackGroup, pool, centeredRack, rSlots)
  focusView()
}

function focusView() {
  if (!props.rack || !camera || !ctrl) return
  const rk = props.rack, midY = rk.height_m * 0.52, bayW = rk.length_m / Math.max(rk.bays, 1)
  const zOff = props.focusBay ? -rk.length_m / 2 + (props.focusBay - 0.5) * bayW : 0
  const dist = props.focusBay ? 10.5 : Math.min(Math.max(rk.length_m * 0.55, 14), 38)
  ctrl.enableRotate = !lockFront.value
  camera.position.set(dist, midY, zOff); ctrl.target.set(0, midY, zOff); ctrl.update()
}

function init3D() {
  if (renderer || !boxEl.value) return
  const el = boxEl.value
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xe2e8f0)
  camera = new THREE.PerspectiveCamera(45, (el.clientWidth || 500) / (el.clientHeight || 420), 0.2, 200)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(el.clientWidth || 500, el.clientHeight || 420)
  el.appendChild(renderer.domElement)
  ctrl = new OrbitControls(camera, renderer.domElement); ctrl.enableDamping = true
  scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 1.25))
  const dir = new THREE.DirectionalLight(0xfffbeb, 1.8); dir.position.set(22, 28, 18); scene.add(dir)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 96), pool.get('concrete_slab')); floor.rotation.x = -Math.PI / 2; scene.add(floor)
  rackGroup = new THREE.Group(); scene.add(rackGroup)
  renderSingleRack()
  ro = new ResizeObserver(() => {
    if (!el.clientWidth || !el.clientHeight) return
    camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight)
  })
  ro.observe(el)
  const tick = () => { rafId = requestAnimationFrame(tick); if (viewType.value === '3d') { ctrl.update(); renderer.render(scene, camera) } }
  tick()
}

watch(viewType, (v) => { if (v === '3d') setTimeout(init3D, 0) })
watch(() => [props.rack?.id, props.slots, props.focusBay], renderSingleRack, { deep: false })
watch(lockFront, focusView)
onMounted(() => { if (viewType.value === '3d') init3D() })
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId); ro?.disconnect()
  rackGroup?.traverse((o: THREE.Object3D) => { if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose() })
  pool.disposeAll(); renderer?.dispose()
})
</script>

<template>
  <div class="single-wrap">
    <div class="bar">
      <button v-if="rack" class="rack-link" title="点击维护货架属性" @click="emit('openRack', rack)">{{ rack.code }} · {{ rack.name }} ⚙</button>
      <span v-else>未选择</span>
      <div class="legend">
        <i class="dot wood"></i>可用 <i class="dot blue"></i>双格合并 <i class="dot yellow"></i>锁定 <i class="dot red"></i>停用
      </div>
      <div class="bar-btns">
        <button class="btn btn-xs" :class="{ 'btn-primary': viewType === '2d' }" @click="viewType = '2d'">2D 正面图</button>
        <button class="btn btn-xs" :class="{ 'btn-primary': viewType === '3d' }" @click="viewType = '3d'">3D 预览</button>
        <template v-if="viewType === '3d'">
          <button class="btn btn-xs" @click="lockFront = !lockFront">{{ lockFront ? '锁定正视' : '自由旋转' }}</button>
          <button class="btn btn-xs" @click="focusView">复位</button>
        </template>
      </div>
    </div>
    <RackFront2D
      v-if="viewType === '2d'"
      :rack="rack" :slots="slots" :focus-bay="focusBay"
      @open-detail="(s) => emit('openDetail', s)"
      @open-level="(p) => emit('openLevel', p)"
      @merge="(id) => emit('merge', id)"
      @split="(id) => emit('split', id)"
      @quick-patch="(p) => emit('quickPatch', p)"
    />
    <div v-show="viewType === '3d'" ref="boxEl" class="stage"></div>
  </div>
</template>

<style scoped>
.single-wrap { display: flex; flex-direction: column; height: 100%; min-height: 520px; border: 1px solid #334155; border-radius: 8px; overflow: hidden; background: #0b1120; }
.bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #0f172a; color: #f8fafc; font-size: 12px; gap: 8px; flex-wrap: wrap; }
.rack-link { background: none; border: none; color: #60a5fa; font-weight: 600; font-size: 12px; cursor: pointer; padding: 0; }
.legend { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #cbd5e1; }
.dot { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
.wood { background: #d6b588; } .blue { background: #2563eb; } .yellow { background: #facc15; } .red { background: #ef4444; }
.bar-btns { display: flex; gap: 4px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }
.stage { flex: 1; min-height: 0; background: #e2e8f0; }
</style>
