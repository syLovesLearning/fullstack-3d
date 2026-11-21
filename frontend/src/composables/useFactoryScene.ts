import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
<<<<<<< HEAD
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem, SlotItem } from '../api/warehouseTypes'
import { rebuildDynamicWarehouse3D } from '../utils/dynamicWarehouse3D'
import { buildDynamicFactoryEquipment, clearEquipmentGroup } from '../utils/factoryEquipment'
import { buildFactoryPerimeter, type FactoryStats } from '../utils/factoryPerimeter'
import { ForkliftDemoRuntime, type DemoStartResult } from '../utils/forkliftDemoRuntime'
import type { ForkliftDemoCallbacks } from '../utils/forkliftDemo'
import { MaterialPool } from '../utils/materialPool'
import { applyRackHighlight, createRackHighlight, pickRackAtPointer } from '../utils/warehousePicking'

export type CamPreset = 'aisle' | 'bird' | 'rail' | 'ebox' | 'fork' | 'equip'

export function useFactoryScene(boxEl: Ref<HTMLElement | null>) {
  const stats = ref<FactoryStats | null>(null)
  const fps = ref(0), drawCalls = ref(0), triangles = ref(0), matCount = ref(0)
  const rackCount = ref(0), slotCount = ref(0), occupiedCount = ref(0), equipmentCount = ref(0)
  const selectedRack = ref<RackLayoutItem | null>(null)
=======
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'
import { rebuildDynamicWarehouse3D } from '../utils/dynamicWarehouse3D'
import { buildFactoryPerimeter, type FactoryStats } from '../utils/factoryPerimeter'
import { MaterialPool } from '../utils/materialPool'

export type CamPreset = 'aisle' | 'bird' | 'rail' | 'ebox' | 'fork'

export function useFactoryScene(boxEl: Ref<HTMLElement | null>) {
  const stats = ref<FactoryStats | null>(null)
  const fps = ref(0)
  const drawCalls = ref(0)
  const triangles = ref(0)
  const matCount = ref(0)
  const rackCount = ref(0)
  const slotCount = ref(0)
>>>>>>> ini

  const pool = new MaterialPool()
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer
  let ctrl: OrbitControls
  let staticGroup: THREE.Group
  let dynamicGroup: THREE.Group
<<<<<<< HEAD
  let equipmentGroup: THREE.Group
  let highlightGroup: THREE.Group
  let equipmentTick: ((dt: number) => void) | null = null
  let demoRuntime: ForkliftDemoRuntime | null = null
=======
>>>>>>> ini
  let pmrem: THREE.PMREMGenerator | null = null
  let envRT: THREE.WebGLRenderTarget | null = null
  let ro: ResizeObserver | null = null
  let rafId = 0
  let frames = 0
  let lastT = performance.now()
  let prevFrame = performance.now()
<<<<<<< HEAD
  let downX = 0
  let downY = 0
  let teardownPick: (() => void) | null = null

  function selectRack(rk: RackLayoutItem | null) {
    selectedRack.value = rk
    applyRackHighlight(highlightGroup, rk)
  }

  function clearSelection() {
    selectRack(null)
  }

  function startForkliftDemo(
    racks: RackLayoutItem[], source: RackLayoutItem, dest: RackLayoutItem,
    cargoColor: string, callbacks: ForkliftDemoCallbacks,
  ): DemoStartResult {
    return demoRuntime?.start(racks, source, dest, cargoColor, callbacks) ?? { ok: false, message: '3D 场景尚未就绪' }
  }

  function stopForkliftDemo() {
    demoRuntime?.stop()
  }
=======
>>>>>>> ini

  function setCam(view: CamPreset) {
    if (!camera || !ctrl) return
    if (view === 'aisle') { camera.position.set(0, 4.5, 64); ctrl.target.set(0, 6, -40) }
    else if (view === 'bird') { camera.position.set(-78, 56, 98); ctrl.target.set(0, 4, 0) }
    else if (view === 'rail') { camera.position.set(-34, 13.5, 22); ctrl.target.set(-44, 10.5, -10) }
    else if (view === 'ebox') { camera.position.set(-36.5, 2.4, -60.5); ctrl.target.set(-41.2, 1.5, -65.5) }
<<<<<<< HEAD
    else if (view === 'equip') { camera.position.set(-14, 15, 46); ctrl.target.set(0, 1, 8) }
=======
>>>>>>> ini
    else { camera.position.set(1.5, 3.2, 54); ctrl.target.set(-4.5, 0.9, 41) }
    ctrl.update()
  }

<<<<<<< HEAD
  function syncWarehouse3D(racks: RackLayoutItem[], roads: RoadZoneItem[], cargos: CargoTypeItem[], slots: SlotItem[]) {
    if (!dynamicGroup) return
    const prevId = selectedRack.value?.id ?? null
    selectRack(null)
    rebuildDynamicWarehouse3D(dynamicGroup, pool, racks, roads, cargos, slots)
    equipmentTick = buildDynamicFactoryEquipment(equipmentGroup, pool, racks, roads)
    equipmentCount.value = equipmentGroup.children.length
    rackCount.value = racks.length
    slotCount.value = slots.length || racks.reduce((acc, r) => acc + r.total_slots, 0)
    occupiedCount.value = slots.filter((s) => s.status === 'occupied').length
    if (prevId) selectRack(racks.find((r) => r.id === prevId) ?? null)
=======
  function syncWarehouse3D(racks: RackLayoutItem[], roads: RoadZoneItem[], cargos: CargoTypeItem[]) {
    if (!dynamicGroup) return
    rebuildDynamicWarehouse3D(dynamicGroup, pool, racks, roads, cargos)
    rackCount.value = racks.length
    slotCount.value = racks.reduce((acc, r) => acc + r.total_slots, 0)
>>>>>>> ini
  }

  onMounted(() => {
    const el = boxEl.value!
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdbeafe)
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0022)
    camera = new THREE.PerspectiveCamera(50, (el.clientWidth || 960) / (el.clientHeight || 600), 0.5, 500)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(el.clientWidth || 960, el.clientHeight || 600)
    el.appendChild(renderer.domElement)

    pmrem = new THREE.PMREMGenerator(renderer)
    envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.55

    ctrl = new OrbitControls(camera, renderer.domElement)
    ctrl.enableDamping = true
    scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 1.05))

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.2)
    sun.position.set(-36, 72, 42)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.04
    Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 62, bottom: -62, near: 10, far: 160 })
    scene.add(sun)

    staticGroup = new THREE.Group()
    dynamicGroup = new THREE.Group()
<<<<<<< HEAD
    equipmentGroup = new THREE.Group()
    equipmentGroup.name = 'equipment'
    highlightGroup = createRackHighlight()
    scene.add(staticGroup, dynamicGroup, equipmentGroup, highlightGroup)
    demoRuntime = new ForkliftDemoRuntime(scene, pool, camera, ctrl)
=======
    scene.add(staticGroup, dynamicGroup)
>>>>>>> ini
    stats.value = buildFactoryPerimeter(staticGroup, pool)
    matCount.value = pool.size
    setCam('aisle')

<<<<<<< HEAD
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
    }
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
      selectRack(pickRackAtPointer(camera, renderer.domElement, e, dynamicGroup))
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    teardownPick = () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
    }

=======
>>>>>>> ini
    ro = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const now = performance.now()
<<<<<<< HEAD
      const dt = (now - prevFrame) / 1000
      stats.value?.onTick(dt)
      equipmentTick?.(dt)
      demoRuntime?.update(dt)
=======
      stats.value?.onTick((now - prevFrame) / 1000)
>>>>>>> ini
      prevFrame = now
      ctrl.update()
      renderer.render(scene, camera)
      frames++
      if (now - lastT >= 400) {
        fps.value = Math.round((frames * 1000) / (now - lastT))
        drawCalls.value = renderer.info.render.calls
        triangles.value = renderer.info.render.triangles
        frames = 0
        lastT = now
      }
    }
    tick()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    ro?.disconnect()
<<<<<<< HEAD
    teardownPick?.()
    teardownPick = null
    equipmentTick = null
    demoRuntime?.dispose()
    demoRuntime = null
    clearEquipmentGroup(equipmentGroup)
    ;[staticGroup, dynamicGroup, highlightGroup].forEach((g) => g?.traverse((o: THREE.Object3D) => {
=======
    ;[staticGroup, dynamicGroup].forEach((g) => g?.traverse((o: THREE.Object3D) => {
>>>>>>> ini
      if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose()
    }))
    pool.disposeAll()
    envRT?.dispose()
    pmrem?.dispose()
    renderer?.dispose()
  })

<<<<<<< HEAD
  return {
    stats, fps, drawCalls, triangles, matCount, rackCount, slotCount, occupiedCount, equipmentCount,
    selectedRack, setCam, syncWarehouse3D, clearSelection, startForkliftDemo, stopForkliftDemo,
  }
=======
  return { stats, fps, drawCalls, triangles, matCount, rackCount, slotCount, setCam, syncWarehouse3D }
>>>>>>> ini
}
