import type { CampusZoneItem } from '../api/warehouseTypes'
import { CAMPUS_H, findCampusAStar, FORKLIFT_IN_SPEED, LIFT_SEC, type GreenRoadRect, type Pt, type RoadNode } from './campusRoadGraph'

export const RESERVE_LIMIT = 10
export const FORKLIFT_OUT_SPEED = 9.5

export const KIND_META = {
  raw: { label: '原料', stroke: '#38bdf8', fill: 'rgba(56,189,248,0.22)', text: '#bae6fd' },
  semi: { label: '半品', stroke: '#fbbf24', fill: 'rgba(251,191,36,0.22)', text: '#fde68a' },
  finished: { label: '成品', stroke: '#34d399', fill: 'rgba(52,211,153,0.22)', text: '#a7f3d0' },
} as const

const PRODUCTS_BY_KIND = {
  raw: ['铜杆原料', '铝材坯料', 'PVC粒料', '辅料托盘'],
  semi: ['半成品绞线', '绝缘线芯', '成缆半品'],
  finished: ['YJV-10kV电缆', '护套成品盘', '阻燃电线箱'],
}

export interface SubZone {
  id: string; parentId: string; parentCode: string; parentName: string; shortLabel: string; name: string
  kind: 'raw' | 'semi' | 'finished'; x: number; y: number; r: number
  stock: number; halted: boolean; prodProg: number; paceMult: number
}

export interface SimFlow {
  id: number; product: string; qty: number; fromSubId: string; toSubId: string
  fromId: string; toId: string; pickPt: Pt; dropPt: Pt; status: 'pending' | 'moving' | 'done'; createdAt: number
}

export interface SimForklift {
  id: number; x: number; y: number; angle: number; state: 'IDLE' | 'TO_PICKUP' | 'LIFTING' | 'TO_DROPOFF' | 'UNLOADING'
  flow: SimFlow | null; path: Pt[]; pathIdx: number; timer: number; blocked: boolean
}

export interface SimTruck { id: number; bay: number; x: number; y: number; targetX: number; targetY: number; state: 'ENTERING' | 'DOCKED' | 'LEAVING'; timer: number }
export interface SimEvent { id: number; time: string; kind: 'spawn' | 'dispatch' | 'pickup' | 'done' | 'blocked' | 'halt' | 'truck'; msg: string }

export interface CampusSimState {
  zones: CampusZoneItem[]; greenRoads: GreenRoadRect[]; nodes: RoadNode[]
  subZones: SubZone[]; flows: SimFlow[]; events: SimEvent[]; forklifts: SimForklift[]; trucks: SimTruck[]
  simTime: number; truckAcc: number; completedCount: number; totalElapsedSum: number
  nextFlowId: number; nextForkId: number; nextTruckId: number; totalEventCount: number
}

export const fmtClock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`

export function pushSimEvent(st: CampusSimState, kind: SimEvent['kind'], msg: string) {
  st.totalEventCount++
  st.events.unshift({ id: st.totalEventCount, time: fmtClock(st.simTime), kind, msg })
  if (st.events.length > 40) st.events.pop()
}

export function rebuildSubZones(st: CampusSimState, preserveStocks = false) {
  const old: Record<string, { stock: number; halted: boolean; prodProg: number }> = {}
  if (preserveStocks) st.subZones.forEach((s) => { old[s.id] = { stock: s.stock, halted: s.halted, prodProg: s.prodProg } })
  st.subZones = []
  for (const z of st.zones) {
    if (z.zone_type !== 'warehouse') continue
    z.sub_layout.forEach((cfg, idx) => {
      const id = `${z.code}-S${idx + 1}`, prev = old[id]
      st.subZones.push({
        id, parentId: z.id, parentCode: z.code, parentName: z.name,
        shortLabel: `${KIND_META[cfg.kind].label}${idx + 1}`, name: `${z.name.slice(0, 2)}${KIND_META[cfg.kind].label}${idx + 1}`,
        kind: cfg.kind, x: z.x + z.w * cfg.rx, y: z.y + z.h * cfg.ry, r: 5.8,
        stock: prev ? prev.stock : cfg.init, halted: prev ? prev.halted : false,
        prodProg: prev ? prev.prodProg : Math.random() * 0.85, paceMult: 2.2 + Math.random() * 1.4,
      })
    })
  }
}

export function addSimFlow(st: CampusSimState, product: string, qty: number, fromSubId: string, toSubId: string) {
  if (fromSubId === toSubId) return
  const s1 = st.subZones.find((s) => s.id === fromSubId), s2 = st.subZones.find((s) => s.id === toSubId)
  if (!s1 || !s2) return
  st.flows.push({
    id: st.nextFlowId++, product, qty, fromSubId: s1.id, toSubId: s2.id, fromId: s1.parentId, toId: s2.parentId,
    pickPt: { x: s1.x, y: s1.y }, dropPt: { x: s2.x, y: s2.y }, status: 'pending', createdAt: st.simTime,
  })
  pushSimEvent(st, 'spawn', `${s1.name} → ${s2.name} (${product}×${qty})`)
  if (st.flows.length > 65) st.flows = st.flows.filter((f) => f.status !== 'done').concat(st.flows.filter((f) => f.status === 'done').slice(-15))
}

export function spawnRandomFlow(st: CampusSimState, prefer?: SubZone | null, qtyOverride?: number) {
  if (st.subZones.length < 2) return
  const s1 = prefer || st.subZones[Math.floor(Math.random() * st.subZones.length)]
  let cands = st.subZones.filter((s) => s.id !== s1.id && s.stock <= RESERVE_LIMIT)
  if (!cands.length) cands = st.subZones.filter((s) => s.id !== s1.id)
  if (s1.kind === 'raw') { const semis = cands.filter((s) => s.kind === 'semi'); if (semis.length && Math.random() < 0.72) cands = semis }
  else if (s1.kind === 'semi') { const fins = cands.filter((s) => s.kind === 'finished'); if (fins.length && Math.random() < 0.72) cands = fins }
  const s2 = cands[Math.floor(Math.random() * cands.length)]
  const prods = PRODUCTS_BY_KIND[s1.kind]
  addSimFlow(st, prods[Math.floor(Math.random() * prods.length)], qtyOverride || (Math.floor(Math.random() * 2) + 1), s1.id, s2.id)
}

export function syncForkliftCount(st: CampusSimState, targetCount: number) {
  const spawnNodes = st.nodes.length ? st.nodes : [{ x: 330, y: 148 }]
  while (st.forklifts.length < targetCount) {
    const nd = spawnNodes[st.forklifts.length % spawnNodes.length]
    st.forklifts.push({ id: st.nextForkId++, x: nd.x, y: nd.y, angle: 0, state: 'IDLE', flow: null, path: [], pathIdx: 0, timer: 0, blocked: false })
  }
  while (st.forklifts.length > targetCount) {
    const idx = st.forklifts.findIndex((f) => f.state === 'IDLE')
    if (idx >= 0) st.forklifts.splice(idx, 1)
    else { const last = st.forklifts.pop(); if (last?.flow) last.flow.status = 'pending' }
  }
}

export function stepCampusSim(st: CampusSimState, dt: number, spawnRate: number, truckInterval: number) {
  st.simTime += dt
  if (spawnRate > 0) {
    for (const s of st.subZones) {
      if (s.stock > RESERVE_LIMIT) { if (!s.halted) { s.halted = true; pushSimEvent(st, 'halt', `${s.name} 预留 ${s.stock} (>10) 爆红停产！`) } continue }
      s.halted = false
      s.prodProg += dt / (Math.max(1, spawnRate) * s.paceMult)
      if (s.prodProg >= 1) {
        s.prodProg -= 1; s.stock += 1
        if (s.stock > RESERVE_LIMIT) { s.halted = true; pushSimEvent(st, 'halt', `${s.name} 预留达 ${s.stock} (>10) 爆红停产！`); spawnRandomFlow(st, s, 2) }
        else if (s.stock >= 2 && st.flows.filter((f) => f.status === 'pending').length < 22 && Math.random() < 0.45) spawnRandomFlow(st, s, 1)
      }
    }
  }
  for (const fk of st.forklifts) {
    if (fk.state !== 'IDLE') continue
    const pending = st.flows.filter((f) => f.status === 'pending')
    if (!pending.length) continue
    let bestF = pending[0], bestScore = Infinity
    for (const f of pending) {
      const s1 = st.subZones.find((s) => s.id === f.fromSubId)
      const d = Math.hypot(f.pickPt.x - fk.x, f.pickPt.y - fk.y) - (s1?.halted ? 180 : 0)
      if (d < bestScore) { bestScore = d; bestF = f }
    }
    bestF.status = 'moving'; fk.flow = bestF
    const curZ = st.zones.find((z) => fk.x >= z.x && fk.x <= z.x + z.w && fk.y >= z.y && fk.y <= z.y + z.h) ?? null
    const z1 = st.zones.find((z) => z.id === bestF.fromId) ?? null
    const s1 = st.subZones.find((s) => s.id === bestF.fromSubId)
    fk.path = findCampusAStar(st.nodes, { x: fk.x, y: fk.y }, curZ, bestF.pickPt, z1)
    fk.pathIdx = 1; fk.state = 'TO_PICKUP'
    pushSimEvent(st, 'dispatch', `叉车#${fk.id} 前往 ${s1 ? s1.name : bestF.fromSubId} 取货`)
  }
  for (const fk of st.forklifts) {
    const prevBlocked = fk.blocked; fk.blocked = false
    if (fk.state === 'IDLE') continue
    if (fk.state === 'LIFTING' || fk.state === 'UNLOADING') {
      fk.timer -= dt
      if (fk.timer <= 0 && fk.flow) {
        if (fk.state === 'LIFTING') {
          const s1 = st.subZones.find((s) => s.id === fk.flow!.fromSubId)
          if (s1 && s1.stock > 0) { s1.stock = Math.max(0, s1.stock - fk.flow.qty); if (s1.stock <= RESERVE_LIMIT) s1.halted = false }
          const z1 = st.zones.find((z) => z.id === fk.flow!.fromId) ?? null, z2 = st.zones.find((z) => z.id === fk.flow!.toId) ?? null
          const s2 = st.subZones.find((s) => s.id === fk.flow!.toSubId)
          fk.path = findCampusAStar(st.nodes, fk.flow.pickPt, z1, fk.flow.dropPt, z2)
          fk.pathIdx = 1; fk.state = 'TO_DROPOFF'
          pushSimEvent(st, 'pickup', `叉车#${fk.id} 装货完毕 → ${s2 ? s2.name : fk.flow.toSubId}`)
        } else {
          fk.flow.status = 'done'; st.completedCount++; st.totalElapsedSum += Math.round(st.simTime - fk.flow.createdAt)
          const s2 = st.subZones.find((s) => s.id === fk.flow!.toSubId)
          if (s2) { s2.stock += fk.flow.qty; if (s2.stock > RESERVE_LIMIT && !s2.halted) { s2.halted = true; pushSimEvent(st, 'halt', `${s2.name} 预留达 ${s2.stock} (>10) 爆红停产！`) } }
          pushSimEvent(st, 'done', `${s2 ? s2.name : fk.flow.toSubId} 入库 +${fk.flow.qty} (${fk.flow.product})`)
          fk.flow = null; fk.state = 'IDLE'
        }
      }
      continue
    }
    const target = fk.path[fk.pathIdx]
    if (!target) { fk.state = fk.state === 'TO_PICKUP' ? 'LIFTING' : 'UNLOADING'; fk.timer = LIFT_SEC; continue }
    const dx = target.x - fk.x, dy = target.y - fk.y, dist = Math.hypot(dx, dy)
    fk.angle = Math.atan2(dy, dx)
    for (const o of st.forklifts) {
      if (o.id === fk.id || o.state === 'IDLE') continue
      const odx = o.x - fk.x, ody = o.y - fk.y, od = Math.hypot(odx, ody)
      if (od < 7.5 && od > 0.1 && ((odx / od) * Math.cos(fk.angle) + (ody / od) * Math.sin(fk.angle) > 0.65) && fk.id > o.id) { fk.blocked = true; break }
    }
    if (fk.blocked) { if (!prevBlocked) pushSimEvent(st, 'blocked', `叉车#${fk.id} 遇前车拥堵排队`); continue }
    const inside = st.zones.some((z) => fk.x >= z.x && fk.x <= z.x + z.w && fk.y >= z.y && fk.y <= z.y + z.h)
    const step = (inside ? FORKLIFT_IN_SPEED : FORKLIFT_OUT_SPEED) * dt
    if (dist <= step) { fk.x = target.x; fk.y = target.y; fk.pathIdx++ } else { fk.x += (dx / dist) * step; fk.y += (dy / dist) * step }
  }
  const dock = st.zones.find((z) => z.zone_type === 'dock')
  if (dock) {
    st.truckAcc += dt
    if (st.truckAcc >= truckInterval && st.trucks.length < 6) {
      st.truckAcc = 0
      const used = new Set(st.trucks.map((t) => t.bay))
      const bay = [0, 1, 2, 3, 4, 5].find((b) => !used.has(b)) ?? -1
      if (bay >= 0) {
        const bx = dock.x + 10 + bay * ((dock.w - 20) / 6) + 5, id = st.nextTruckId++
        st.trucks.push({ id, bay, x: dock.x - 24, y: dock.y + dock.h + 12, targetX: bx, targetY: dock.y + dock.h - 14, state: 'ENTERING', timer: 14 })
        pushSimEvent(st, 'truck', `大货车#${id} 驶入 ${bay + 1}号月台泊位`)
      }
    }
    for (let i = st.trucks.length - 1; i >= 0; i--) {
      const tr = st.trucks[i]
      if (tr.state === 'ENTERING') {
        const dx = tr.targetX - tr.x, dy = tr.targetY - tr.y, d = Math.hypot(dx, dy)
        if (d < 1.5) { tr.x = tr.targetX; tr.y = tr.targetY; tr.state = 'DOCKED' } else { tr.x += (dx / d) * 16 * dt; tr.y += (dy / d) * 16 * dt }
      } else if (tr.state === 'DOCKED') { tr.timer -= dt; if (tr.timer <= 0) tr.state = 'LEAVING' }
      else { tr.y += 18 * dt; if (tr.y > CAMPUS_H + 30) st.trucks.splice(i, 1) }
    }
  }
}
