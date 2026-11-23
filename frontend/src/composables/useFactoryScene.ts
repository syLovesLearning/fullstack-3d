import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem, WarehouseSlotItem } from '../api/warehouseTypes'
import { rebuildDynamicWarehouse3D } from '../utils/dynamicWarehouse3D'
import { buildFactoryPerimeter, type FactoryStats } from '../utils/factoryPerimeter'
import { MaterialPool } from '../utils/materialPool'

export type CamPreset = 'aisle' | 'bird' | 'rail' | 'ebox' | 'fork' | 'forklift'

export function useFactoryScene(boxEl: Ref<HTMLElement | null>, onDoubleClickRack?: (rackId: string) => void) {
  const stats = ref<FactoryStats | null>(null)
  const fps = ref(0)
  const drawCalls = ref(0)
  const triangles = ref(0)
  const matCount = ref(0)
  const highDpr = ref(false)
  const isFrontView = ref(false)

  const pool = new MaterialPool()
  const pickables: THREE.Object3D[] = []
  const raycaster = new THREE.Raycaster()
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer
  let ctrl: OrbitControls
  let staticGroup: THREE.Group
  let dynamicGroup: THREE.Group
  let pmrem: THREE.PMREMGenerator | null = null
  let envRT: THREE.WebGLRenderTarget | null = null
  let ro: ResizeObserver | null = null
  let rafId = 0
  let running = true
  let frames = 0
  let lastT = performance.now()
  let prevFrame = performance.now()

  function exitFrontView() {
    isFrontView.value = false
    if (ctrl) ctrl.enableRotate = true
  }

  function setCam(view: CamPreset) {
    if (!camera || !ctrl) return
    exitFrontView()
    if (view === 'aisle') { camera.position.set(0, 4.5, 64); ctrl.target.set(0, 6, -40) }
    else if (view === 'bird') { camera.position.set(-78, 56, 98); ctrl.target.set(0, 4, 0) }
    else if (view === 'rail') { camera.position.set(-34, 13.5, 22); ctrl.target.set(-44, 10.5, -10) }
    else if (view === 'ebox') { camera.position.set(-36.5, 2.4, -60.5); ctrl.target.set(-41.2, 1.5, -65.5) }
    else if (view === 'forklift') { camera.position.set(-3.1, 1.55, 50.8); ctrl.target.set(-6.0, 1.0, 48.1) }
    else { camera.position.set(1.5, 3.2, 54); ctrl.target.set(-4.5, 0.9, 41) }
    ctrl.update()
  }

  function focusRackFront(rack: RackLayoutItem, bayIdx?: number) {
    if (!camera || !ctrl) return
    isFrontView.value = true
    ctrl.enableRotate = false
    const midY = rack.height_m * 0.52
    const bayW = rack.length_m / Math.max(rack.bays, 1)
    const offsetAlong = bayIdx ? -rack.length_m / 2 + (bayIdx - 0.5) * bayW : 0
    const dist = bayIdx ? 11.5 : Math.min(Math.max(rack.length_m * 0.42, 14), 28)
    if (rack.rotation_deg === 90) {
      const side = rack.pos_z >= 0 ? -1 : 1
      camera.position.set(rack.pos_x + offsetAlong, midY, rack.pos_z + side * dist)
      ctrl.target.set(rack.pos_x + offsetAlong, midY, rack.pos_z)
    } else {
      const side = rack.pos_x >= 0 ? -1 : 1
      camera.position.set(rack.pos_x + side * dist, midY, rack.pos_z + offsetAlong)
      ctrl.target.set(rack.pos_x, midY, rack.pos_z + offsetAlong)
    }
    ctrl.update()
  }

  function toggleQuality() {
    highDpr.value = !highDpr.value
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio, highDpr.value ? 2 : 1.25))
  }

  function tick() {
    if (!running) return
    rafId = requestAnimationFrame(tick)
    const now = performance.now()
    stats.value?.onTick(Math.min((now - prevFrame) / 1000, 0.05))
    prevFrame = now
    ctrl.update()
    renderer.render(scene, camera)
    frames++
    if (now - lastT >= 400) {
      fps.value = Math.round((frames * 1000) / (now - lastT))
      drawCalls.value = renderer.info.render.calls
      triangles.value = renderer.info.render.triangles
      frames = 0; lastT = now
    }
  }

  function setPaused(paused: boolean) {
    if (paused && running) { running = false; cancelAnimationFrame(rafId) }
    else if (!paused && !running && renderer) { running = true; prevFrame = performance.now(); lastT = prevFrame; frames = 0; tick() }
  }

  function syncWarehouse3D(racks: RackLayoutItem[], roads: RoadZoneItem[], cargos: CargoTypeItem[], slots: WarehouseSlotItem[], selectedRackId: string) {
    if (!dynamicGroup) return
    rebuildDynamicWarehouse3D(dynamicGroup, pickables, pool, racks, roads, cargos, slots, selectedRackId)
  }

  function onDblClick(e: MouseEvent) {
    if (!renderer || !camera || !onDoubleClickRack) return
    const rect = renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObjects(pickables, false)
    if (hits.length && hits[0].object.userData?.rackId) onDoubleClickRack(hits[0].object.userData.rackId)
  }

  onMounted(() => {
    const el = boxEl.value!
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdbeafe)
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0022)
    camera = new THREE.PerspectiveCamera(50, (el.clientWidth || 960) / (el.clientHeight || 600), 0.15, 500)
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setSize(el.clientWidth || 960, el.clientHeight || 600)
    el.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('dblclick', onDblClick)

    pmrem = new THREE.PMREMGenerator(renderer)
    envRT = pmrem.fromScene(new RoomEnvironment(), 0.06)
    scene.environment = envRT.texture; scene.environmentIntensity = 0.5

    ctrl = new OrbitControls(camera, renderer.domElement); ctrl.enableDamping = true
    scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 1.05))
    const sun = new THREE.DirectionalLight(0xfffbeb, 2.2)
    sun.position.set(-36, 72, 42); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04
    Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 62, bottom: -62, near: 10, far: 160 })
    scene.add(sun)

    staticGroup = new THREE.Group(); dynamicGroup = new THREE.Group()
    scene.add(staticGroup, dynamicGroup)
    stats.value = buildFactoryPerimeter(staticGroup, pool)
    matCount.value = pool.size
    setCam('aisle')

    ro = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)
    tick()
  })

  onBeforeUnmount(() => {
    running = false; cancelAnimationFrame(rafId); ro?.disconnect()
    renderer?.domElement.removeEventListener('dblclick', onDblClick)
    const disposed = new Set<THREE.BufferGeometry>()
    ;[staticGroup, dynamicGroup].forEach((g) => g?.traverse((o: THREE.Object3D) => {
      if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry && !disposed.has(o.geometry)) { o.geometry.dispose(); disposed.add(o.geometry) }
    }))
    pool.disposeAll(); envRT?.dispose(); pmrem?.dispose(); renderer?.dispose()
  })

  return { stats, fps, drawCalls, triangles, matCount, highDpr, isFrontView, setCam, focusRackFront, exitFrontView, toggleQuality, setPaused, syncWarehouse3D }
}
