import * as THREE from 'three'
import type { RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'
import { getRackFootprint, PLANT_L, PLANT_W } from './warehouseGeometry'
import { MaterialPool } from './materialPool'
import { buildRobotCell } from './equipRobotCell'
import { buildCableWinder } from './equipCableWinder'
import { buildCncCenter } from './equipCnc'
import { buildInspectionLine } from './equipInspection'
import { buildAirCompressor } from './equipCompressor'
import { buildScissorLift } from './equipScissorLift'
import { buildAgv } from './equipAgv'
import { buildWorkbench } from './equipWorkbench'
import type { EquipmentModel } from './equipmentTypes'

interface Box { x: number; z: number; w: number; d: number }

export type PlacementBox = Box

let lastEquipmentZones: PlacementBox[] = []

export function getEquipmentZones(): PlacementBox[] {
  return lastEquipmentZones
}

const MARGIN = 2.0
const CLEARANCE = 1.0

/** 与既有静态产线/电缆盘/托盘区/配电柜保持距离，避免新设备压到旧模型。 */
export const STATIC_ZONES: Box[] = [
  { x: -22, z: 0, w: 6, d: 101 }, { x: 22, z: 0, w: 6, d: 101 },
  { x: -20.5, z: 50.5, w: 10, d: 9 }, { x: -20.5, z: -50.5, w: 10, d: 9 },
  { x: 20.5, z: 50.5, w: 10, d: 9 }, { x: 20.5, z: -50.5, w: 10, d: 9 },
  { x: -7.5, z: 42.5, w: 4, d: 12 }, { x: 7.5, z: 42.5, w: 4, d: 12 },
  { x: -41.2, z: -65.5, w: 4, d: 4 },
]

const BUILDERS = [
  buildRobotCell, buildCableWinder, buildCncCenter, buildInspectionLine,
  buildAirCompressor, buildScissorLift, buildAgv, buildAgv, buildWorkbench,
]

function overlaps(a: Box, b: Box, gap = CLEARANCE) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + gap && Math.abs(a.z - b.z) * 2 < a.d + b.d + gap
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function layoutSeed(racks: RackLayoutItem[], roads: RoadZoneItem[]) {
  let h = 2166136261
  for (const r of racks) {
    const s = `${r.id}:${r.pos_x}:${r.pos_z}:${r.rotation_deg}`
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  for (const r of roads) {
    const s = `${r.id}:${r.pos_x}:${r.pos_z}:${r.width_m}:${r.length_m}`
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

function disposeModel(model: EquipmentModel) {
  model.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((m) => { if (m.userData.own) m.dispose() })
  })
}

export function clearEquipmentGroup(group: THREE.Group) {
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((m) => { if (m.userData.own) m.dispose() })
  })
  group.clear()
}

/** 根据当前货架/道路布局，把设备随机摆进空白区域；同一布局结果稳定。 */
export function buildDynamicFactoryEquipment(
  group: THREE.Group, pool: MaterialPool, racks: RackLayoutItem[], roads: RoadZoneItem[],
): (dt: number) => void {
  clearEquipmentGroup(group)
  const rng = mulberry32(layoutSeed(racks, roads))
  const obstacles: Box[] = [
    ...STATIC_ZONES,
    ...racks.map((r) => {
      const span = getRackFootprint(r)
      return { x: r.pos_x, z: r.pos_z, w: span.spanX, d: span.spanZ }
    }),
    ...roads.map((r) => ({ x: r.pos_x, z: r.pos_z, w: r.width_m, d: r.length_m })),
  ]
  const placed: Box[] = []
  const ticks: ((dt: number) => void)[] = []

  for (const build of BUILDERS) {
    const model = build(pool)
    let ok = false
    for (let attempt = 0; attempt < 260; attempt++) {
      const quarter = Math.floor(rng() * 4) * Math.PI / 2
      const swapped = Math.abs(Math.sin(quarter)) > 0.7
      const w = swapped ? model.depth : model.width
      const d = swapped ? model.width : model.depth
      const minX = -PLANT_W / 2 + MARGIN + w / 2
      const maxX = PLANT_W / 2 - MARGIN - w / 2
      const minZ = -PLANT_L / 2 + MARGIN + d / 2
      const maxZ = PLANT_L / 2 - MARGIN - d / 2
      if (maxX <= minX || maxZ <= minZ) break
      const x = minX + rng() * (maxX - minX)
      const z = minZ + rng() * (maxZ - minZ)
      const box: Box = { x, z, w, d }
      if ([...obstacles, ...placed].some((o) => overlaps(box, o))) continue
      model.group.position.set(x, 0, z)
      model.group.rotation.y = quarter
      model.group.userData.equipmentName = build.name
      group.add(model.group)
      placed.push(box)
      if (model.tick) ticks.push(model.tick)
      ok = true
      break
    }
    if (!ok) disposeModel(model)
  }
  lastEquipmentZones = placed

  return (dt: number) => {
    for (const tick of ticks) tick(dt)
  }
}
