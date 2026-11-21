import * as THREE from 'three'
<<<<<<< HEAD
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem, SlotItem } from '../api/warehouseTypes'
import { MaterialPool, type PoolKey } from './materialPool'

interface InstanceItem { rackIdx: number; pos: [number, number, number]; scale?: [number, number, number]; rotY?: number; rotZ?: number }
=======
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'
import { MaterialPool, type PoolKey } from './materialPool'

interface InstanceItem { pos: [number, number, number]; scale?: [number, number, number]; rotY?: number; rotZ?: number }
>>>>>>> ini

function addInstanced(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, items: InstanceItem[]) {
  if (!items.length) { geo.dispose(); return }
  const inst = new THREE.InstancedMesh(geo, mat, items.length)
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.pos)
    d.rotation.set(0, it.rotY ?? 0, it.rotZ ?? 0)
    d.scale.set(...(it.scale ?? [1, 1, 1]))
    d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.castShadow = true
  inst.receiveShadow = true
  inst.matrixAutoUpdate = false
  inst.updateMatrix()
<<<<<<< HEAD
  inst.userData.rackIndexByInstance = items.map((it) => it.rackIdx)
=======
>>>>>>> ini
  group.add(inst)
}

function resolveCargoPoolKey(modelKey: string): PoolKey {
  if (modelKey === 'cargo_crate') return 'crate_blue'
  if (modelKey === 'cargo_drum') return 'drum_teal'
  if (modelKey === 'cargo_reel') return 'pallet_wood'
  return 'cardboard_box'
}

<<<<<<< HEAD
function slotLevelY(rk: RackLayoutItem, level: number) {
  return 0.25 + (level * (rk.height_m - 1.2)) / Math.max(rk.levels - 1, 1)
}

function slotZ(rk: RackLayoutItem, bayW: number, bay: number, slot: number) {
  const cz = -rk.length_m / 2 + bay * bayW + bayW / 2
  return cz + ((slot + 0.5) / rk.slots_per_bay - 0.5) * (bayW * 0.8)
}

=======
>>>>>>> ini
export function rebuildDynamicWarehouse3D(
  layer: THREE.Group,
  pool: MaterialPool,
  racks: RackLayoutItem[],
  roads: RoadZoneItem[],
  cargos: CargoTypeItem[],
<<<<<<< HEAD
  slots: SlotItem[],
=======
>>>>>>> ini
) {
  layer.traverse((o: THREE.Object3D) => {
    if ('geometry' in o && o.geometry instanceof THREE.BufferGeometry) o.geometry.dispose()
  })
  layer.clear()
<<<<<<< HEAD
  layer.userData.racks = racks
=======
>>>>>>> ini

  for (const rd of roads) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(rd.width_m, rd.length_m), pool.get('safety_green'))
    plane.rotation.x = -Math.PI / 2
    plane.position.set(rd.pos_x, 0.015, rd.pos_z)
    plane.receiveShadow = true
    plane.matrixAutoUpdate = false
    plane.updateMatrix()
    layer.add(plane)
  }

  const cargoMap = new Map(cargos.map((c) => [c.code, c]))
<<<<<<< HEAD
  const slotsByRack = new Map<string, SlotItem[]>()
  for (const sl of slots) slotsByRack.set(sl.rack_id, [...(slotsByRack.get(sl.rack_id) ?? []), sl])

  const uprights: InstanceItem[] = []
  const beams: InstanceItem[] = []
  const pallets: InstanceItem[] = []
  const maintenancePallets: InstanceItem[] = []
  const lockedPallets: InstanceItem[] = []
=======
  const uprights: InstanceItem[] = []
  const beams: InstanceItem[] = []
  const pallets: InstanceItem[] = []
>>>>>>> ini
  const boxes: InstanceItem[] = []
  const crates: InstanceItem[] = []
  const drums: InstanceItem[] = []
  const reels: InstanceItem[] = []

<<<<<<< HEAD
  for (let rackIdx = 0; rackIdx < racks.length; rackIdx++) {
    const rk = racks[rackIdx]
=======
  for (const rk of racks) {
>>>>>>> ini
    const rotY = rk.rotation_deg === 90 ? Math.PI / 2 : 0
    const cosR = Math.cos(rotY)
    const sinR = Math.sin(rotY)
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
      rk.pos_x + lx * cosR + lz * sinR, ly, rk.pos_z - lx * sinR + lz * cosR,
    ]
    const bayW = rk.length_m / rk.bays
    const startZ = -rk.length_m / 2
    const halfD = rk.width_m / 2
<<<<<<< HEAD

    function emitSlot(bay: number, level: number, slot: number, status: string, cargoCode: string | null) {
      if (bay >= rk.bays || level >= rk.levels || slot >= rk.slots_per_bay) return
      const ly = slotLevelY(rk, level)
      const pz = slotZ(rk, bayW, bay, slot)
      if (status === 'maintenance') {
        maintenancePallets.push({ rackIdx, pos: toWorld(0, ly + 0.14, pz), rotY })
        return
      }
      if (status === 'locked') {
        lockedPallets.push({ rackIdx, pos: toWorld(0, ly + 0.14, pz), rotY })
        return
      }
      pallets.push({ rackIdx, pos: toWorld(0, ly + 0.14, pz), rotY })
      if (status !== 'occupied') return
      const cargo = cargoCode ? cargoMap.get(cargoCode) : undefined
      const matKey = cargo ? resolveCargoPoolKey(cargo.model_key) : 'cardboard_box'
      if (matKey === 'crate_blue') {
        for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) crates.push({ rackIdx, pos: toWorld(dx, ly + 0.43, pz + dz), rotY })
      } else if (matKey === 'drum_teal') {
        for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) drums.push({ rackIdx, pos: toWorld(dx, ly + 0.67, pz + dz), rotY })
      } else if (matKey === 'pallet_wood') {
        reels.push({ rackIdx, pos: toWorld(0, ly + 0.72, pz), rotY, rotZ: Math.PI / 2 })
      } else {
        boxes.push({ rackIdx, pos: toWorld(0, ly + 0.74, pz), rotY })
      }
    }
=======
    const cargo = rk.cargo_type_code ? cargoMap.get(rk.cargo_type_code) : undefined
    const matKey = cargo ? resolveCargoPoolKey(cargo.model_key) : 'cardboard_box'
>>>>>>> ini

    for (let b = 0; b <= rk.bays; b++) {
      const lz = startZ + b * bayW
      for (const sx of [-halfD, halfD]) {
<<<<<<< HEAD
        uprights.push({ rackIdx, pos: toWorld(sx, rk.height_m / 2, lz), scale: [1, rk.height_m, 1], rotY })
=======
        uprights.push({ pos: toWorld(sx, rk.height_m / 2, lz), scale: [1, rk.height_m, 1], rotY })
>>>>>>> ini
      }
      if (b < rk.bays) {
        const cz = lz + bayW / 2
        for (let l = 0; l < rk.levels; l++) {
<<<<<<< HEAD
          const ly = slotLevelY(rk, l)
          for (const sx of [-halfD, halfD]) beams.push({ rackIdx, pos: toWorld(sx, ly, cz), scale: [1, 1, bayW], rotY })
        }
      }
    }

    const rackSlots = slotsByRack.get(rk.id)
    if (rackSlots?.length) {
      for (const sl of rackSlots) emitSlot(sl.bay_no, sl.level_no, sl.slot_no, sl.status, sl.cargo_type_code)
    } else {
      // 兼容：货架尚无台账时回退到"绑定货品即整排画满"的旧表现
      for (let b = 0; b < rk.bays; b++) {
        for (let l = 0; l < rk.levels; l++) {
          for (let s = 0; s < rk.slots_per_bay; s++) {
            emitSlot(b, l, s, rk.cargo_type_code ? 'occupied' : 'empty', rk.cargo_type_code)
=======
          const ly = 0.25 + (l * (rk.height_m - 1.2)) / Math.max(rk.levels - 1, 1)
          for (const sx of [-halfD, halfD]) beams.push({ pos: toWorld(sx, ly, cz), scale: [1, 1, bayW], rotY })
          for (let s = 0; s < rk.slots_per_bay; s++) {
            const pz = cz + ((s + 0.5) / rk.slots_per_bay - 0.5) * (bayW * 0.8)
            pallets.push({ pos: toWorld(0, ly + 0.14, pz), rotY })
            if (matKey === 'crate_blue') {
              for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) crates.push({ pos: toWorld(dx, ly + 0.43, pz + dz), rotY })
            } else if (matKey === 'drum_teal') {
              for (const dx of [-0.34, 0.34]) for (const dz of [-0.36, 0.36]) drums.push({ pos: toWorld(dx, ly + 0.67, pz + dz), rotY })
            } else if (matKey === 'pallet_wood') {
              reels.push({ pos: toWorld(0, ly + 0.72, pz), rotY, rotZ: Math.PI / 2 })
            } else {
              boxes.push({ pos: toWorld(0, ly + 0.74, pz), rotY })
            }
>>>>>>> ini
          }
        }
      }
    }
  }

  addInstanced(layer, new THREE.BoxGeometry(0.12, 1, 0.12), pool.get('steel_column'), uprights)
  addInstanced(layer, new THREE.BoxGeometry(0.09, 0.14, 1), pool.get('crane_rail'), beams)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('pallet_wood'), pallets)
<<<<<<< HEAD
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('agv_yellow'), maintenancePallets)
  addInstanced(layer, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('alert_red'), lockedPallets)
=======
>>>>>>> ini
  addInstanced(layer, new THREE.BoxGeometry(1.28, 1.05, 1.38), pool.get('cardboard_box'), boxes)
  addInstanced(layer, new THREE.BoxGeometry(0.58, 0.42, 0.64), pool.get('crate_blue'), crates)
  addInstanced(layer, new THREE.CylinderGeometry(0.28, 0.28, 0.92, 12), pool.get('drum_teal'), drums)
  addInstanced(layer, new THREE.CylinderGeometry(0.54, 0.54, 0.86, 14), pool.get('pallet_wood'), reels)
}
