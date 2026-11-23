import type { CampusDoor, CampusRoadItem, CampusZoneItem } from '../api/warehouseTypes'

export const CAMPUS_W = 680
export const CAMPUS_H = 420
export const FORKLIFT_IN_SPEED = 3.2
export const LIFT_SEC = 6

export interface Pt { x: number; y: number }
export interface GreenRoadRect { x: number; y: number; w: number; h: number; label: string; isSpur: boolean; id?: string }
export interface RoadNode { x: number; y: number; adj: { to: number; cost: number }[] }

export function doorWorldPos(z: Pick<CampusZoneItem, 'x' | 'y' | 'w' | 'h'>, d: CampusDoor): Pt {
  if (d.side === 'top') return { x: z.x + z.w * d.off, y: z.y }
  if (d.side === 'bottom') return { x: z.x + z.w * d.off, y: z.y + z.h }
  if (d.side === 'left') return { x: z.x, y: z.y + z.h * d.off }
  return { x: z.x + z.w, y: z.y + z.h * d.off }
}

export function buildInternalOrthoPath(z: Pick<CampusZoneItem, 'x' | 'y' | 'w' | 'h'>, fromPt: Pt, toPt: Pt): Pt[] {
  const aisleX = z.x + z.w * 0.5
  const aisleY = z.y + z.h * 0.58
  const pts: Pt[] = [{ x: fromPt.x, y: fromPt.y }]
  const pushPt = (x: number, y: number) => {
    const last = pts[pts.length - 1]
    if (Math.hypot(last.x - x, last.y - y) > 0.3) pts.push({ x, y })
  }
  if (Math.abs(fromPt.y - z.y) < 1 || Math.abs(fromPt.y - (z.y + z.h)) < 1) {
    pushPt(fromPt.x, aisleY)
    pushPt(toPt.x, aisleY)
  } else {
    pushPt(aisleX, fromPt.y)
    pushPt(aisleX, toPt.y)
  }
  pushPt(toPt.x, toPt.y)
  return pts
}

export function rebuildGreenRoadNetwork(zones: CampusZoneItem[], dbRoads: CampusRoadItem[]): { greenRoads: GreenRoadRect[]; nodes: RoadNode[] } {
  const greenRoads: GreenRoadRect[] = dbRoads.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h, label: r.code, isSpur: false }))
  const nodes: RoadNode[] = []
  const addNode = (x: number, y: number) => {
    const idx = nodes.findIndex((n) => Math.abs(n.x - x) < 0.5 && Math.abs(n.y - y) < 0.5)
    if (idx >= 0) return idx
    nodes.push({ x, y, adj: [] })
    return nodes.length - 1
  }
  const connect = (a: number, b: number) => {
    if (a === b) return
    const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y)
    if (!nodes[a].adj.some((e) => e.to === b)) nodes[a].adj.push({ to: b, cost: d })
    if (!nodes[b].adj.some((e) => e.to === a)) nodes[b].adj.push({ to: a, cost: d })
  }

  const spineXs = new Set<number>([16, 330, 512, 664])
  const spineYs = new Set<number>([14, 148, 256, 396])
  for (const r of dbRoads) {
    if (r.w > r.h * 2) spineYs.add(Math.round(r.y + r.h / 2))
    else if (r.h > r.w * 2) spineXs.add(Math.round(r.x + r.w / 2))
  }
  const sxArr = [...spineXs].sort((a, b) => a - b)
  const syArr = [...spineYs].sort((a, b) => a - b)
  const hLines = syArr.map((y) => ({ y, xs: new Set(sxArr) }))
  const vLines = sxArr.map((x) => ({ x, ys: new Set(syArr) }))

  const addSpur = (x1: number, y1: number, x2: number, y2: number, w = 7) => {
    if (Math.abs(x1 - x2) < 0.2 && Math.abs(y1 - y2) < 0.2) return
    if (Math.abs(y1 - y2) < 0.2) {
      const y = y1, minX = Math.min(x1, x2), maxX = Math.max(x1, x2)
      greenRoads.push({ x: minX - w / 2, y: y - w / 2, w: maxX - minX + w, h: w, label: '', isSpur: true })
      let hl = hLines.find((l) => Math.abs(l.y - y) < 0.5)
      if (!hl) { hl = { y, xs: new Set() }; hLines.push(hl) }
      hl.xs.add(minX); hl.xs.add(maxX)
      for (const vl of vLines) {
        if (vl.x >= minX - 0.5 && vl.x <= maxX + 0.5 && y >= Math.min(...vl.ys) - 0.5 && y <= Math.max(...vl.ys) + 0.5) {
          hl.xs.add(vl.x); vl.ys.add(y)
        }
      }
    } else if (Math.abs(x1 - x2) < 0.2) {
      const x = x1, minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
      greenRoads.push({ x: x - w / 2, y: minY - w / 2, w, h: maxY - minY + w, label: '', isSpur: true })
      let vl = vLines.find((l) => Math.abs(l.x - x) < 0.5)
      if (!vl) { vl = { x, ys: new Set() }; vLines.push(vl) }
      vl.ys.add(minY); vl.ys.add(maxY)
      for (const hl of hLines) {
        if (hl.y >= minY - 0.5 && hl.y <= maxY + 0.5 && x >= Math.min(...hl.xs) - 0.5 && x <= Math.max(...hl.xs) + 0.5) {
          vl.ys.add(hl.y); hl.xs.add(x)
        }
      }
    }
  }

  for (const z of zones) {
    const openDoors = z.doors.filter((d) => d.open)
    for (const d of openDoors.length ? openDoors : z.doors.slice(0, 1)) {
      const dp = doorWorldPos(z, d)
      if (d.side === 'top' || d.side === 'bottom') {
        const dir = d.side === 'top' ? -1 : 1
        let bestY = dir < 0 ? 14 : 396, bestDist = Infinity
        for (const sy of syArr) {
          if ((dir < 0 && sy < dp.y - 4) || (dir > 0 && sy > dp.y + 4)) {
            const dist = Math.abs(sy - dp.y)
            const blocked = zones.some((oz) => oz.id !== z.id && dp.x > oz.x - 4 && dp.x < oz.x + oz.w + 4 && Math.min(dp.y, sy) < oz.y + oz.h && Math.max(dp.y, sy) > oz.y)
            if (!blocked && dist < bestDist) { bestDist = dist; bestY = sy }
          }
        }
        addSpur(dp.x, dp.y, dp.x, bestY)
      } else {
        const dir = d.side === 'left' ? -1 : 1
        let bestX = dir < 0 ? 16 : 664, bestDist = Infinity
        for (const sx of sxArr) {
          if ((dir < 0 && sx < dp.x - 4) || (dir > 0 && sx > dp.x + 4)) {
            const dist = Math.abs(sx - dp.x)
            const blocked = zones.some((oz) => oz.id !== z.id && dp.y > oz.y - 4 && dp.y < oz.y + oz.h + 4 && Math.min(dp.x, sx) < oz.x + oz.w && Math.max(dp.x, sx) > oz.x)
            if (!blocked && dist < bestDist) { bestDist = dist; bestX = sx }
          }
        }
        addSpur(dp.x, dp.y, bestX, dp.y)
      }
    }
  }

  for (const hl of hLines) {
    const xs = [...hl.xs].sort((a, b) => a - b)
    for (let i = 0; i < xs.length - 1; i++) {
      const mx = (xs[i] + xs[i + 1]) / 2
      if (!zones.some((z) => mx > z.x + 1 && mx < z.x + z.w - 1 && hl.y > z.y + 1 && hl.y < z.y + z.h - 1)) {
        connect(addNode(xs[i], hl.y), addNode(xs[i + 1], hl.y))
      }
    }
  }
  for (const vl of vLines) {
    const ys = [...vl.ys].sort((a, b) => a - b)
    for (let i = 0; i < ys.length - 1; i++) {
      const my = (ys[i] + ys[i + 1]) / 2
      if (!zones.some((z) => vl.x > z.x + 1 && vl.x < z.x + z.w - 1 && my > z.y + 1 && my < z.y + z.h - 1)) {
        connect(addNode(vl.x, ys[i]), addNode(vl.x, ys[i + 1]))
      }
    }
  }
  return { greenRoads, nodes }
}

export function findCampusAStar(baseNodes: RoadNode[], fromPos: Pt, fromZone: CampusZoneItem | null, toPos: Pt, toZone: CampusZoneItem | null): Pt[] {
  if (fromZone && toZone && fromZone.id === toZone.id) return buildInternalOrthoPath(fromZone, fromPos, toPos)
  const nodes: RoadNode[] = baseNodes.map((n) => ({ x: n.x, y: n.y, adj: n.adj.map((e) => ({ ...e })) }))
  if (!nodes.length) return [fromPos, toPos]
  const addTemp = (x: number, y: number) => {
    const idx = nodes.findIndex((n) => Math.hypot(n.x - x, n.y - y) < 0.8)
    if (idx >= 0) return idx
    nodes.push({ x, y, adj: [] })
    return nodes.length - 1
  }
  const conn = (a: number, b: number) => {
    if (a === b) return
    const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y)
    nodes[a].adj.push({ to: b, cost: d }); nodes[b].adj.push({ to: a, cost: d })
  }
  const pathLen = (pts: Pt[]) => pts.reduce((acc, p, i) => (i === 0 ? 0 : acc + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)), 0)

  const starts: { dIdx: number; inPath: Pt[]; inCost: number }[] = []
  if (fromZone) {
    const open = fromZone.doors.filter((d) => d.open)
    for (const d of open.length ? open : fromZone.doors.slice(0, 1)) {
      const dp = doorWorldPos(fromZone, d), inPath = buildInternalOrthoPath(fromZone, fromPos, dp)
      starts.push({ dIdx: addTemp(dp.x, dp.y), inPath, inCost: pathLen(inPath) })
    }
  } else {
    let bestN = 0, bd = Infinity
    nodes.forEach((n, i) => { const d = Math.hypot(n.x - fromPos.x, n.y - fromPos.y); if (d < bd) { bd = d; bestN = i } })
    const sIdx = addTemp(fromPos.x, fromPos.y), elbow = addTemp(nodes[bestN].x, fromPos.y)
    conn(sIdx, elbow); conn(elbow, bestN)
    starts.push({ dIdx: sIdx, inPath: [fromPos], inCost: 0 })
  }

  const ends: { dIdx: number; outPath: Pt[]; outCost: number }[] = []
  if (toZone) {
    const open = toZone.doors.filter((d) => d.open)
    for (const d of open.length ? open : toZone.doors.slice(0, 1)) {
      const dp = doorWorldPos(toZone, d), outPath = buildInternalOrthoPath(toZone, dp, toPos)
      ends.push({ dIdx: addTemp(dp.x, dp.y), outPath, outCost: pathLen(outPath) })
    }
  }

  let bestPath: Pt[] | null = null, bestCost = Infinity
  for (const sc of starts) {
    for (const ec of ends) {
      const g = new Array(nodes.length).fill(Infinity), f = new Array(nodes.length).fill(Infinity), came = new Array(nodes.length).fill(-1)
      const open = new Set([sc.dIdx])
      g[sc.dIdx] = 0; f[sc.dIdx] = Math.abs(nodes[ec.dIdx].x - nodes[sc.dIdx].x) + Math.abs(nodes[ec.dIdx].y - nodes[sc.dIdx].y)
      while (open.size) {
        let cur = -1, bestF = Infinity
        for (const id of open) if (f[id] < bestF) { bestF = f[id]; cur = id }
        if (cur === ec.dIdx) {
          const pts: Pt[] = []
          let c = cur
          while (c !== -1) { pts.push({ x: nodes[c].x, y: nodes[c].y }); c = came[c] }
          pts.reverse()
          const cost = sc.inCost + g[ec.dIdx] + ec.outCost
          if (cost < bestCost) { bestCost = cost; bestPath = [...sc.inPath, ...pts.slice(1), ...ec.outPath.slice(1)] }
          break
        }
        open.delete(cur)
        for (const e of nodes[cur].adj) {
          const tg = g[cur] + e.cost
          if (tg < g[e.to]) { came[e.to] = cur; g[e.to] = tg; f[e.to] = tg + Math.abs(nodes[ec.dIdx].x - nodes[e.to].x) + Math.abs(nodes[ec.dIdx].y - nodes[e.to].y); open.add(e.to) }
        }
      }
    }
  }
  return bestPath || [fromPos, toPos]
}

export function calcBestDoorAndInternal(z: CampusZoneItem, target: Pt) {
  const tx = z.x + target.x, ty = z.y + target.y
  const open = z.doors.filter((d) => d.open)
  const pool = open.length ? open : z.doors
  if (!pool.length) return { doorId: '-', doorSide: '-', distM: 0, sec: LIFT_SEC, closedAll: true }
  let best = pool[0], bestDist = Infinity
  for (const d of pool) {
    const dp = doorWorldPos(z, d), dist = Math.abs(dp.x - tx) + Math.abs(dp.y - ty)
    if (dist < bestDist) { bestDist = dist; best = d }
  }
  return { doorId: best.id, doorSide: best.side, distM: Math.round(bestDist), sec: Math.round(bestDist / FORKLIFT_IN_SPEED + LIFT_SEC), closedAll: !open.length }
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number, pad = 0): boolean {
  return ax < bx + bw + pad && ax + aw + pad > bx && ay < by + bh + pad && ay + ah + pad > by
}

export function checkCampusZoneConflict(
  candidate: { id?: string; x: number; y: number; w: number; h: number },
  zones: CampusZoneItem[],
  roads: CampusRoadItem[],
): string | null {
  if (candidate.x < 10 || candidate.y < 10 || candidate.x + candidate.w > CAMPUS_W - 10 || candidate.y + candidate.h > CAMPUS_H - 10) {
    return '超出园区安全边界'
  }
  for (const r of roads) {
    if (rectsOverlap(candidate.x, candidate.y, candidate.w, candidate.h, r.x, r.y, r.w, r.h, 2)) {
      return `与道路 [${r.name}] 冲突`
    }
  }
  for (const other of zones) {
    if (other.id === candidate.id) continue
    if (rectsOverlap(candidate.x, candidate.y, candidate.w, candidate.h, other.x, other.y, other.w, other.h, 8)) {
      return `与厂区 [${other.name}] 重叠`
    }
  }
  return null
}
