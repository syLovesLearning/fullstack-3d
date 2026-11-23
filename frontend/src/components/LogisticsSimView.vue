<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listCampusRoads, listCampusZones, resetCampusZones, updateCampusZone, type CampusRoadItem } from '../api/client'
import { computeCampusTransform, drawCampusScene } from '../utils/campusCanvasDraw'
import { calcBestDoorAndInternal, doorWorldPos, findCampusAStar, rebuildGreenRoadNetwork } from '../utils/campusRoadGraph'
import {
  addSimFlow, fmtClock, pushSimEvent, rebuildSubZones, RESERVE_LIMIT, spawnRandomFlow, stepCampusSim, syncForkliftCount,
  type CampusSimState,
} from '../utils/campusSimEngine'

const props = defineProps<{ token: string }>()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const simRunning = ref(true), speed = ref(3), forkliftCount = ref(15), spawnRate = ref(8), truckRate = ref(12)
const inProduct = ref('YJV-10kV 电缆'), inQty = ref(2), fromSubId = ref(''), toSubId = ref('')
const selectedZoneId = ref(''), selectedSubId = ref(''), tickVersion = ref(0)
let dbRoads: CampusRoadItem[] = []
let rafId = 0, lastTs = 0, ro: ResizeObserver | null = null

const st: CampusSimState = {
  zones: [], greenRoads: [], nodes: [], subZones: [], flows: [], events: [], forklifts: [], trucks: [],
  simTime: 0, truckAcc: 0, completedCount: 0, totalElapsedSum: 0, nextFlowId: 1, nextForkId: 1, nextTruckId: 1, totalEventCount: 0,
}

const hud = computed(() => {
  void tickVersion.value
  return {
    clock: `${fmtClock(st.simTime)} · 已运 ${st.completedCount} 单`,
    pending: st.flows.filter((f) => f.status === 'pending').length,
    blocked: st.forklifts.filter((f) => f.blocked).length,
    halted: st.subZones.filter((s) => s.stock > RESERVE_LIMIT).length,
    avgSec: st.completedCount ? Math.round(st.totalElapsedSum / st.completedCount) : 0,
    flows: st.flows.slice(-14).reverse(),
    events: st.events.slice(0, 16),
    subZones: st.subZones,
    sel: (() => {
      const z = st.zones.find((item) => item.id === selectedZoneId.value) ?? st.zones[0]
      if (!z) return { title: '-', dim: '-', pt: '-', door: '-', dist: '-', sec: '-' }
      const s = st.subZones.find((sub) => sub.id === selectedSubId.value && sub.parentId === z.id)
      const pt = s ? { x: s.x - z.x, y: s.y - z.y } : { x: z.w * 0.5, y: z.h * 0.58 }
      const info = calcBestDoorAndInternal(z, pt)
      return {
        title: `${z.name}${s ? ` · ${s.shortLabel}(预留${s.stock})` : ''}`, dim: `${z.w}×${z.h}m (${z.doors.length}门)`,
        pt: `(${Math.round(pt.x)}m, ${Math.round(pt.y)}m)`, door: info.closedAll ? '全关(兜底)' : `${info.doorId} (${info.doorSide})`,
        dist: `${info.distM} m`, sec: `${info.sec} 秒`,
      }
    })(),
  }
})

function rebuildNetwork(preserveStocks: boolean) {
  const net = rebuildGreenRoadNetwork(st.zones, dbRoads)
  st.greenRoads = net.greenRoads; st.nodes = net.nodes
  rebuildSubZones(st, preserveStocks)
  if (!fromSubId.value && st.subZones.length > 1) { fromSubId.value = st.subZones[0].id; toSubId.value = st.subZones[st.subZones.length - 1].id }
}

async function loadCampusData(preserveStocks = false) {
  const [zs, rds] = await Promise.all([listCampusZones(props.token), listCampusRoads(props.token)])
  st.zones = zs; dbRoads = rds
  if (!selectedZoneId.value && zs.length) selectedZoneId.value = zs[0].id
  rebuildNetwork(preserveStocks)
  syncForkliftCount(st, forkliftCount.value)
  if (!st.flows.length) for (let i = 0; i < 6; i++) spawnRandomFlow(st)
  tickVersion.value++
}

async function handleRandomize() {
  st.zones = await resetCampusZones(props.token, true)
  rebuildNetwork(true)
  st.flows.forEach((f) => {
    const s1 = st.subZones.find((s) => s.id === f.fromSubId), s2 = st.subZones.find((s) => s.id === f.toSubId)
    if (s1) f.pickPt = { x: s1.x, y: s1.y }; if (s2) f.dropPt = { x: s2.x, y: s2.y }
    if (f.status === 'moving') f.status = 'pending'
  })
  st.forklifts = []; syncForkliftCount(st, forkliftCount.value)
  pushSimEvent(st, 'dispatch', '已随机重排仓库位置并重建绿色正交路网')
  tickVersion.value++
}

async function handleReset() {
  st.simTime = 0; st.truckAcc = 0; st.completedCount = 0; st.totalElapsedSum = 0; st.totalEventCount = 0
  st.flows = []; st.events = []; st.trucks = []; st.forklifts = []
  await loadCampusData(false)
}

function onCanvasClick(e: MouseEvent) {
  const c = canvasEl.value; if (!c) return
  const rect = c.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top
  const { viewScale, padX, padY } = computeCampusTransform(rect.width, rect.height)
  const mx = (px - padX) / viewScale, my = (py - padY) / viewScale
  for (const z of st.zones) {
    for (const d of z.doors) {
      const dp = doorWorldPos(z, d)
      if (Math.hypot(px - (padX + dp.x * viewScale), py - (padY + dp.y * viewScale)) <= 10) {
        d.open = !d.open; rebuildNetwork(true)
        st.forklifts.forEach((fk) => {
          if (fk.state === 'TO_PICKUP' && fk.flow) fk.path = findCampusAStar(st.nodes, { x: fk.x, y: fk.y }, null, fk.flow.pickPt, st.zones.find((zn) => zn.id === fk.flow!.fromId) ?? null)
          else if (fk.state === 'TO_DROPOFF' && fk.flow) fk.path = findCampusAStar(st.nodes, { x: fk.x, y: fk.y }, null, fk.flow.dropPt, st.zones.find((zn) => zn.id === fk.flow!.toId) ?? null)
          fk.pathIdx = 1
        })
        selectedZoneId.value = z.id; tickVersion.value++
        void updateCampusZone(props.token, z.id, { doors: z.doors })
        return
      }
    }
  }
  const hitSub = st.subZones.find((s) => Math.hypot(mx - s.x, my - s.y) <= s.r + 3)
  if (hitSub) { selectedSubId.value = hitSub.id; selectedZoneId.value = hitSub.parentId; tickVersion.value++; return }
  const hitZ = st.zones.find((z) => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h)
  if (hitZ) { selectedZoneId.value = hitZ.id; tickVersion.value++ }
}

function drawFrame() {
  const c = canvasEl.value; if (!c || !c.parentElement) return
  const r = c.parentElement.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr) }
  const ctx = c.getContext('2d'); if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  drawCampusScene(ctx, r.width, r.height, st, { selectedZoneId: selectedZoneId.value, selectedSubId: selectedSubId.value, simMode: true })
}

function tick(ts: number) {
  if (!lastTs) lastTs = ts
  const rawDt = Math.min((ts - lastTs) / 1000, 0.08); lastTs = ts
  if (simRunning.value && st.zones.length) { stepCampusSim(st, rawDt * speed.value, spawnRate.value, truckRate.value); tickVersion.value++ }
  drawFrame(); rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  void loadCampusData(false)
  ro = new ResizeObserver(drawFrame)
  if (canvasEl.value?.parentElement) ro.observe(canvasEl.value.parentElement)
  rafId = requestAnimationFrame(tick)
})
onBeforeUnmount(() => { cancelAnimationFrame(rafId); ro?.disconnect() })
</script>

<template>
  <div class="sim-shell">
    <div class="sim-bar">
      <div class="bar-left">
        <strong>大型厂区 2D 物流调度模拟器 (680m × 420m)</strong>
        <span class="clock">{{ hud.clock }}</span>
      </div>
      <div class="bar-actions">
        <button class="btn btn-ok" @click="handleRandomize">随机重排仓库与路网</button>
        <button class="btn btn-warn" @click="() => { for (let i = 0; i < 10; i++) spawnRandomFlow(st); tickVersion++ }">早高峰爆单 (+10)</button>
        <button class="btn btn-primary" @click="simRunning = !simRunning">{{ simRunning ? '暂停仿真' : '继续仿真' }}</button>
        <button class="btn" @click="handleReset">重置</button>
        <select v-model.number="speed" class="inp"><option :value="1">1x 真实</option><option :value="3">3x 畅玩</option><option :value="8">8x 极速压测</option></select>
      </div>
    </div>

    <div class="sim-grid">
      <section class="card canvas-card">
        <div class="card-head">
          <span>严格沿绿色正交道路行驶 · 点击墙门可开关支路并同步保存</span>
          <div class="hud-nums">
            <span>待运: <b>{{ hud.pending }}</b></span><span>堵车: <b class="rose">{{ hud.blocked }}</b></span>
            <span>爆红停产: <b class="red">{{ hud.halted }}</b></span><span>平均耗时: <b class="emerald">{{ hud.avgSec }}s</b></span>
          </div>
        </div>
        <div class="stage"><canvas ref="canvasEl" @click="onCanvasClick" /></div>
      </section>

      <aside class="side">
        <div class="card pad">
          <strong>游戏参数实时调节</strong>
          <label class="rng"><span>叉车数量：<b>{{ forkliftCount }} 台</b></span><input v-model.number="forkliftCount" type="range" min="1" max="50" @input="syncForkliftCount(st, forkliftCount)" /></label>
          <label class="rng"><span>生产周期：<b>{{ spawnRate === 0 ? '暂停' : `每 ${spawnRate}s` }}</b></span><input v-model.number="spawnRate" type="range" min="0" max="30" /></label>
          <label class="rng"><span>大货车间隔：<b>每 {{ truckRate }}s 一车</b></span><input v-model.number="truckRate" type="range" min="2" max="60" /></label>
        </div>

        <div class="card pad">
          <div class="row-between"><strong>{{ hud.sel.title }}</strong><span class="muted">{{ hud.sel.dim }}</span></div>
          <div class="kv"><span>内部落点: <b>{{ hud.sel.pt }}</b></span><span>最近门: <b>{{ hud.sel.door }}</b></span><span>仓内距: <b>{{ hud.sel.dist }}</b></span><span>耗时: <b>{{ hud.sel.sec }}</b></span></div>
        </div>

        <div class="card pad">
          <strong>手动派发子仓调拨</strong>
          <div class="disp-grid">
            <input v-model="inProduct" class="inp" placeholder="产品名称" /><input v-model.number="inQty" class="inp" type="number" min="1" max="50" />
            <select v-model="fromSubId" class="inp"><option v-for="s in hud.subZones" :key="s.id" :value="s.id">{{ s.name }}</option></select>
            <select v-model="toSubId" class="inp"><option v-for="s in hud.subZones" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          </div>
          <button class="btn btn-ok full" @click="() => { addSimFlow(st, inProduct || '电缆', inQty || 1, fromSubId, toSubId); tickVersion++ }">+ 立即派单到任务池</button>
        </div>

        <div class="card pad list-box">
          <div class="row-between"><strong>调拨队列 / 事件流</strong><span class="muted">累计 {{ st.totalEventCount }} 条</span></div>
          <div class="scroll">
            <div v-for="ev in hud.events" :key="ev.id" class="ev-row"><span class="muted">{{ ev.time }}</span><span class="tag">{{ ev.kind }}</span><span class="txt">{{ ev.msg }}</span></div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sim-shell { display: flex; flex-direction: column; gap: 10px; color: #e2e8f0; }
.sim-bar, .card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; }
.sim-bar { padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.bar-left, .bar-actions, .hud-nums { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.clock { padding: 2px 8px; border-radius: 99px; background: #064e3b; color: #6ee7b7; font-family: monospace; }
.sim-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; align-items: start; }
.canvas-card { overflow: hidden; }
.card-head { padding: 8px 12px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; font-size: 12px; flex-wrap: wrap; gap: 6px; }
.stage { height: 540px; background: #020617; }
canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
.side { display: flex; flex-direction: column; gap: 10px; font-size: 12px; }
.pad { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.rng { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #cbd5e1; }
.rng span { display: flex; justify-content: space-between; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.kv, .disp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; }
.inp { padding: 4px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; }
.full { width: 100%; }
.scroll { max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.ev-row { display: flex; gap: 6px; align-items: center; padding: 3px 6px; background: #1e293b; border-radius: 4px; font-size: 11px; }
.tag { padding: 1px 4px; border-radius: 3px; background: #334155; color: #93c5fd; font-size: 10px; }
.txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: #94a3b8; font-family: monospace; font-size: 11px; }
.rose { color: #fb7185; } .red { color: #f87171; } .emerald { color: #34d399; }
.btn-ok { background: #059669; border-color: #10b981; color: #fff; }
.btn-warn { background: #b45309; border-color: #d97706; color: #fff; }
</style>
