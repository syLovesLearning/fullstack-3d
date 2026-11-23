import * as THREE from 'three'
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem, WarehouseSlotItem } from '../api/warehouseTypes'
import { MaterialPool, type PoolKey } from './materialPool'

interface InstanceItem { pos: [number, number, number]; scale?: [number, number, number]; rotY?: number; rotZ?: number }

function addInstanced(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, items: InstanceItem[]) {
  if (!items.length) { geo.dispose(); return }
  const inst = new THREE.InstancedMesh(geo, mat, items.length)
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.pos); d.rotation.set(0, it.rotY ?? 0, it.rotZ ?? 0); d.scale.set(...(it.scale ?? [1, 1, 1])); d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.castShadow = false; inst.receiveShadow = true; inst.matrixAutoUpdate = false; inst.updateMatrix(); group.add(inst)
}

function resolveCargoPoolKey(modelKey: string): PoolKey {
  if (modelKey === 'cargo_crate') return 'crate_blue'
  if (modelKey === 'cargo_drum') return 'drum_teal'
  if (modelKey === 'cargo_reel') return 'pallet_wood'
  return 'cardboard_box'
}

/** 独立单货架正面图：纯库位状态与双格合并托盘可视化（不画具体产品）。 */
export function renderSingleRackLocations3D(layer: THREE.Group, pool: MaterialPool, rk: RackLayoutItem, slots: WarehouseSlotItem[]) {
  layer.traverse((o: THREE.Object3D) => { if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose() })
  layer.clear()

  const slotMap = new Map<string, WarehouseSlotItem>()
  for (const s of slots) slotMap.set(`${s.bay_idx}:${s.level_idx}:${s.slot_idx}`, s)
  const uprights: InstanceItem[] = [], beams: InstanceItem[] = [], decks: InstanceItem[] = []
  const availPallets: InstanceItem[] = [], mergedPallets: InstanceItem[] = [], lockedPallets: InstanceItem[] = [], disabledPallets: InstanceItem[] = []
  const bayW = rk.length_m / rk.bays, startZ = -rk.length_m / 2, halfD = rk.width_m / 2

  for (let b = 0; b <= rk.bays; b++) {
    const lz = startZ + b * bayW
    for (const sx of [-halfD, halfD]) uprights.push({ pos: [sx, rk.height_m / 2, lz], scale: [1, rk.height_m, 1] })
    if (b >= rk.bays) continue
    const cz = lz + bayW / 2
    for (let l = 0; l < rk.levels; l++) {
      const ly = 0.25 + (l * (rk.height_m - 1.2)) / Math.max(rk.levels - 1, 1)
      for (const sx of [-halfD, halfD]) beams.push({ pos: [sx, ly, cz], scale: [1, 1, bayW] })
      decks.push({ pos: [0, ly + 0.05, cz], scale: [Math.max(rk.width_m - 0.1, 0.4), 1, Math.max(bayW - 0.12, 0.4)] })
      for (let s = 0; s < rk.slots_per_bay; s++) {
        const rec = slotMap.get(`${b + 1}:${l + 1}:${s + 1}`)
        if (rec?.status === 'merged') continue
        const span = rec?.span_slots === 2 ? 2 : 1
        const pz = span === 2 ? cz : cz + ((s + 0.5) / rk.slots_per_bay - 0.5) * (bayW * 0.8)
        const item: InstanceItem = { pos: [0, ly + 0.14, pz], scale: [1, 1, span === 2 ? 2.15 : 1] }
        if (rec?.status === 'locked') lockedPallets.push(item)
        else if (rec?.status === 'disabled') disabledPallets.push(item)
        else if (span === 2) mergedPallets.push(item)
        else availPallets.push(item)
      }
    }
  }
  addInstanced(layer, new THREE.BoxGeometry(0.12, 1, 0.12), pool.get('rack_upright'), uprights)
  addInstanced(layer, new THREE.BoxGeometry(0.09, 0.14, 1), pool.get('rack_beam'), beams)
  addInstanced(layer, new THREE.BoxGeometry(1, 0.04, 1), pool.get('corbel'), decks)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('pallet_wood'), availPallets)
  addInstanced(layer, new THREE.BoxGeometry(1.45, 0.18, 1.5), pool.get('crate_blue'), mergedPallets)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.16, 1.5), pool.get('agv_yellow'), lockedPallets)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('alert_red'), disabledPallets)
}

export function rebuildDynamicWarehouse3D(
  layer: THREE.Group, pickables: THREE.Object3D[], pool: MaterialPool,
  racks: RackLayoutItem[], roads: RoadZoneItem[], cargos: CargoTypeItem[], _slots: WarehouseSlotItem[], selectedRackId: string,
) {
  layer.traverse((o: THREE.Object3D) => { if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose() })
  layer.clear(); pickables.length = 0
  for (const rd of roads) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(rd.width_m, rd.length_m), pool.get('safety_green'))
    plane.rotation.x = -Math.PI / 2; plane.position.set(rd.pos_x, 0.015, rd.pos_z)
    plane.receiveShadow = true; plane.matrixAutoUpdate = false; plane.updateMatrix(); layer.add(plane)
  }
  const cargoMap = new Map(cargos.map((c) => [c.code, c]))
  const uprights: InstanceItem[] = [], beams: InstanceItem[] = [], decks: InstanceItem[] = [], pallets: InstanceItem[] = []
  const boxes: InstanceItem[] = [], crates: InstanceItem[] = [], drums: InstanceItem[] = [], reels: InstanceItem[] = []
  const hitMat = new THREE.MeshBasicMaterial({ visible: false })

  for (const rk of racks) {
    const rotY = rk.rotation_deg === 90 ? Math.PI / 2 : 0, cosR = Math.cos(rotY), sinR = Math.sin(rotY)
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [rk.pos_x + lx * cosR + lz * sinR, ly, rk.pos_z - lx * sinR + lz * cosR]
    const hitGeo = new THREE.BoxGeometry(rk.width_m + 0.4, rk.height_m + 0.2, rk.length_m + 0.2)
    const hitMesh = new THREE.Mesh(hitGeo, hitMat)
    hitMesh.position.set(rk.pos_x, rk.height_m / 2, rk.pos_z); hitMesh.rotation.y = rotY; hitMesh.userData = { rackId: rk.id }
    layer.add(hitMesh); pickables.push(hitMesh)
    if (rk.id === selectedRackId) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(hitGeo), new THREE.LineBasicMaterial({ color: 0x2563eb }))
      edges.position.copy(hitMesh.position); edges.rotation.y = rotY; layer.add(edges)
    }
    const bayW = rk.length_m / rk.bays, startZ = -rk.length_m / 2, halfD = rk.width_m / 2
    const cargo = rk.cargo_type_code ? cargoMap.get(rk.cargo_type_code) : undefined
    const matKey = cargo ? resolveCargoPoolKey(cargo.model_key) : 'cardboard_box'
    for (let b = 0; b <= rk.bays; b++) {
      const lz = startZ + b * bayW
      for (const sx of [-halfD, halfD]) uprights.push({ pos: toWorld(sx, rk.height_m / 2, lz), scale: [1, rk.height_m, 1], rotY })
      if (b >= rk.bays) continue
      const cz = lz + bayW / 2
      for (let l = 0; l < rk.levels; l++) {
        const ly = 0.25 + (l * (rk.height_m - 1.2)) / Math.max(rk.levels - 1, 1)
        for (const sx of [-halfD, halfD]) beams.push({ pos: toWorld(sx, ly, cz), scale: [1, 1, bayW], rotY })
        decks.push({ pos: toWorld(0, ly + 0.05, cz), scale: [Math.max(rk.width_m - 0.1, 0.4), 1, Math.max(bayW - 0.12, 0.4)], rotY })
        for (let s = 0; s < rk.slots_per_bay; s++) {
          const pz = cz + ((s + 0.5) / rk.slots_per_bay - 0.5) * (bayW * 0.8)
          pallets.push({ pos: toWorld(0, ly + 0.14, pz), rotY })
          if (matKey === 'crate_blue') { for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) crates.push({ pos: toWorld(dx, ly + 0.43, pz + dz), rotY }) }
          else if (matKey === 'drum_teal') { for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) drums.push({ pos: toWorld(dx, ly + 0.67, pz + dz), rotY }) }
          else if (matKey === 'pallet_wood') reels.push({ pos: toWorld(0, ly + 0.72, pz), rotY, rotZ: Math.PI / 2 })
          else boxes.push({ pos: toWorld(0, ly + 0.74, pz), rotY })
        }
      }
    }
  }
  addInstanced(layer, new THREE.BoxGeometry(0.12, 1, 0.12), pool.get('rack_upright'), uprights)
  addInstanced(layer, new THREE.BoxGeometry(0.09, 0.14, 1), pool.get('rack_beam'), beams)
  addInstanced(layer, new THREE.BoxGeometry(1, 0.04, 1), pool.get('corbel'), decks)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('pallet_wood'), pallets)
  addInstanced(layer, new THREE.BoxGeometry(1.28, 1.05, 1.38), pool.get('cardboard_box'), boxes)
  addInstanced(layer, new THREE.BoxGeometry(0.58, 0.42, 0.64), pool.get('crate_blue'), crates)
  addInstanced(layer, new THREE.CylinderGeometry(0.28, 0.28, 0.92, 8), pool.get('drum_teal'), drums)
  addInstanced(layer, new THREE.CylinderGeometry(0.54, 0.54, 0.86, 10), pool.get('pallet_wood'), reels)
}
