import type { RackLayoutItem } from '../api/warehouseTypes'
import { getEquipmentZones, STATIC_ZONES } from './factoryEquipment'
import { getRackFootprint, PLANT_L, PLANT_W } from './warehouseGeometry'

export interface PathPoint { x: number; z: number }

export interface ForkliftPathPlan {
  points: PathPoint[]
  length: number
  sourceStage: PathPoint
  destStage: PathPoint
}

interface Obstacle { x: number; z: number; w: number; d: number; clear: number }

const CELL = 2
const COLS = Math.floor(PLANT_W / CELL)
const ROWS = Math.floor(PLANT_L / CELL)
const MARGIN = 2.0
const RACK_CLEAR = 1.0
const ZONE_CLEAR = 0.6

function inside(x: number, z: number, o: Obstacle) {
  return Math.abs(x - o.x) <= o.w / 2 + o.clear && Math.abs(z - o.z) <= o.d / 2 + o.clear
}

function buildObstacles(racks: RackLayoutItem[], includeEquipment: boolean, includeStatic: boolean): Obstacle[] {
  const list: Obstacle[] = racks.map((r) => {
    const span = getRackFootprint(r)
    return { x: r.pos_x, z: r.pos_z, w: span.spanX, d: span.spanZ, clear: RACK_CLEAR }
  })
  const zones = [
    ...(includeStatic ? STATIC_ZONES : []),
    ...(includeEquipment ? getEquipmentZones() : []),
  ]
  for (const z of zones) list.push({ x: z.x, z: z.z, w: z.w, d: z.d, clear: ZONE_CLEAR })
  return list
}

function blockedAt(x: number, z: number, obstacles: Obstacle[]) {
  if (Math.abs(x) > PLANT_W / 2 - MARGIN || Math.abs(z) > PLANT_L / 2 - MARGIN) return true
  return obstacles.some((o) => inside(x, z, o))
}

function centerX(col: number) { return -PLANT_W / 2 + col * CELL + CELL / 2 }
function centerZ(row: number) { return -PLANT_L / 2 + row * CELL + CELL / 2 }
const colOf = (x: number) => Math.max(0, Math.min(COLS - 1, Math.floor((x + PLANT_W / 2) / CELL)))
const rowOf = (z: number) => Math.max(0, Math.min(ROWS - 1, Math.floor((z + PLANT_L / 2) / CELL)))

function buildGrid(obstacles: Obstacle[]) {
  const grid = new Uint8Array(COLS * ROWS)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (blockedAt(centerX(c), centerZ(r), obstacles)) grid[r * COLS + c] = 1
  }
  return grid
}

function nearestFree(col: number, row: number, grid: Uint8Array): number | null {
  for (let radius = 0; radius <= 10; radius++) {
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue
      const r = row + dr
      const c = col + dc
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue
      if (!grid[r * COLS + c]) return r * COLS + c
    }
  }
  return null
}

function astar(start: number, goal: number, grid: Uint8Array): number[] | null {
  const size = COLS * ROWS
  const g = new Float64Array(size).fill(Infinity)
  const came = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)
  const open: number[] = [start]
  g[start] = 0
  const heur = (idx: number) => {
    const dc = Math.abs((idx % COLS) - (goal % COLS))
    const dr = Math.abs(Math.floor(idx / COLS) - Math.floor(goal / COLS))
    return Math.max(dc, dr) + 0.414 * Math.min(dc, dr)
  }

  while (open.length) {
    let best = 0
    let bestF = Infinity
    for (let i = 0; i < open.length; i++) {
      const f = g[open[i]] + heur(open[i])
      if (f < bestF) { bestF = f; best = i }
    }
    const cur = open.splice(best, 1)[0]
    if (cur === goal) {
      const path: number[] = []
      let node = cur
      while (node !== -1) { path.push(node); node = came[node] }
      return path.reverse()
    }
    if (closed[cur]) continue
    closed[cur] = 1
    const col = cur % COLS
    const row = Math.floor(cur / COLS)
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const c = col + dc
      const r = row + dr
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue
      const n = r * COLS + c
      if (grid[n] || closed[n]) continue
      if (dc && dr && (grid[row * COLS + c] || grid[r * COLS + col])) continue
      const cost = dc && dr ? 1.414 : 1
      const next = g[cur] + cost
      if (next < g[n] - 1e-9) {
        g[n] = next
        came[n] = cur
        open.push(n)
      }
    }
  }
  return null
}

function stagePoint(rack: RackLayoutItem, obstacles: Obstacle[]): PathPoint {
  const span = getRackFootprint(rack)
  const near = rack.pos_x >= 0 ? -1 : 1
  const candidates: PathPoint[] = [
    { x: rack.pos_x + near * (span.spanX / 2 + 2.6), z: rack.pos_z },
    { x: rack.pos_x - near * (span.spanX / 2 + 2.6), z: rack.pos_z },
    { x: rack.pos_x, z: rack.pos_z + span.spanZ / 2 + 2.6 },
    { x: rack.pos_x, z: rack.pos_z - span.spanZ / 2 - 2.6 },
  ]
  return candidates.find((p) => !blockedAt(p.x, p.z, obstacles)) ?? candidates[0]
}

function lineClear(a: PathPoint, b: PathPoint, obstacles: Obstacle[]) {
  const dist = Math.hypot(a.x - b.x, a.z - b.z)
  const steps = Math.max(2, Math.ceil(dist / 0.6))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, obstacles)) return false
  }
  return true
}

function simplify(points: PathPoint[], obstacles: Obstacle[]) {
  if (points.length <= 2) return points
  const out = [points[0]]
  let i = 0
  while (i < points.length - 1) {
    let j = points.length - 1
    while (j > i + 1 && !lineClear(points[i], points[j], obstacles)) j--
    out.push(points[j])
    i = j
  }
  return out
}

function tryPlan(
  racks: RackLayoutItem[], src: RackLayoutItem, dst: RackLayoutItem,
  includeEquipment: boolean, includeStatic: boolean,
) {
  const obstacles = buildObstacles(racks, includeEquipment, includeStatic)
  const sourceStage = stagePoint(src, obstacles)
  const destStage = stagePoint(dst, obstacles)
  const grid = buildGrid(obstacles)
  const start = nearestFree(colOf(sourceStage.x), rowOf(sourceStage.z), grid)
  const goal = nearestFree(colOf(destStage.x), rowOf(destStage.z), grid)
  if (start == null || goal == null) return null
  const cells = astar(start, goal, grid)
  if (!cells) return null
  const raw: PathPoint[] = cells.map((idx) => ({ x: centerX(idx % COLS), z: centerZ(Math.floor(idx / COLS)) }))
  const points = simplify(raw, obstacles)
  if (lineClear(points[points.length - 1], destStage, obstacles)) points.push(destStage)
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
  return { points, length, sourceStage: points[0], destStage: points[points.length - 1] }
}

export function planForkliftPathStrict(racks: RackLayoutItem[], source: RackLayoutItem, dest: RackLayoutItem): ForkliftPathPlan | null {
  return tryPlan(racks, source, dest, true, true) ?? tryPlan(racks, source, dest, false, true)
}

export function planForkliftPath(racks: RackLayoutItem[], source: RackLayoutItem, dest: RackLayoutItem): ForkliftPathPlan | null {
  return planForkliftPathStrict(racks, source, dest) ?? tryPlan(racks, source, dest, false, false)
}
