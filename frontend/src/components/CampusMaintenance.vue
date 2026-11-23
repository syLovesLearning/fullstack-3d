<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createCampusRoad, deleteCampusRoad, listCampusRoads, listCampusZones, resetCampusZones, updateCampusZone,
  type CampusDoor, type CampusRoadItem, type CampusZoneItem,
} from '../api/client'
import { checkCampusZoneConflict } from '../utils/campusRoadGraph'
import CampusFloorCanvas from './CampusFloorCanvas.vue'
import CampusRoadPanel from './CampusRoadPanel.vue'

const props = defineProps<{ token: string }>()
const zones = ref<CampusZoneItem[]>([])
const roads = ref<CampusRoadItem[]>([])
const selectedZoneId = ref('')
const selectedRoadId = ref('')
const msg = ref(''), err = ref('')

const activeZone = computed(() => zones.value.find((z) => z.id === selectedZoneId.value) ?? zones.value[0] ?? null)

async function refresh() {
  err.value = ''
  try {
    const [zs, rds] = await Promise.all([listCampusZones(props.token), listCampusRoads(props.token)])
    zones.value = zs; roads.value = rds
    if (!selectedZoneId.value && zs.length) selectedZoneId.value = zs[0].id
  } catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleSaveZone(z: CampusZoneItem) {
  err.value = ''; msg.value = ''
  const conflict = checkCampusZoneConflict(z, zones.value, roads.value)
  if (conflict) { err.value = `保存拦截：${conflict}`; return }
  try { await updateCampusZone(props.token, z.id, { name: z.name, x: z.x, y: z.y, w: z.w, h: z.h, doors: z.doors }); msg.value = `已保存 [${z.name}] 位置与门控`; await refresh() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleMoveZone(p: { id: string; x: number; y: number }) {
  try { await updateCampusZone(props.token, p.id, { x: p.x, y: p.y }); msg.value = '已更新厂区位置'; await refresh() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleToggleDoor(p: { id: string; doors: CampusDoor[] }) {
  try { await updateCampusZone(props.token, p.id, { doors: p.doors }); msg.value = '已更新墙门开关并重建支路'; await refresh() }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

async function handleReset(randomize: boolean) {
  err.value = ''; msg.value = ''
  try { zones.value = await resetCampusZones(props.token, randomize); msg.value = randomize ? '已随机重排厂区布局' : '已恢复默认园区布局' }
  catch (e) { err.value = e instanceof Error ? e.message : String(e) }
}

onMounted(refresh)
</script>

<template>
  <div class="cm-shell">
    <div class="cm-head">
      <span>厂区位置维护 & 园区道路维护（680m × 420m，修改将同步至「物流模拟」）</span>
      <div class="cm-actions">
        <button class="btn btn-primary" @click="handleReset(true)">随机重排仓库位置</button>
        <button class="btn" @click="handleReset(false)">恢复默认布局</button>
        <button class="btn" @click="refresh">刷新同步</button>
      </div>
    </div>
    <p v-if="msg" class="ok-box">{{ msg }}</p><p v-if="err" class="err-box">{{ err }}</p>

    <div class="split">
      <CampusFloorCanvas :zones="zones" :roads="roads" :selected-zone-id="selectedZoneId" :selected-road-id="selectedRoadId" @select-zone="(id) => (selectedZoneId = id)" @select-road="(id) => (selectedRoadId = id)" @move-zone="handleMoveZone" @toggle-door="handleToggleDoor" />
      <div class="side-col">
        <div v-if="activeZone" class="sub-card">
          <h4>厂区位置与门控编辑（点击左侧画布或下方列表切换）</h4>
          <div class="zone-tabs">
            <button v-for="z in zones" :key="z.id" class="btn btn-xs" :class="{ 'btn-primary': z.id === activeZone.id }" @click="selectedZoneId = z.id">{{ z.name }}</button>
          </div>
          <div class="form-row">
            <input v-model="activeZone.name" class="inp" />
            <label class="lbl">X <input v-model.number="activeZone.x" class="inp xs" type="number" /></label>
            <label class="lbl">Y <input v-model.number="activeZone.y" class="inp xs" type="number" /></label>
            <label class="lbl">宽W <input v-model.number="activeZone.w" class="inp xs" type="number" /></label>
            <label class="lbl">高H <input v-model.number="activeZone.h" class="inp xs" type="number" /></label>
            <button class="btn btn-primary" @click="handleSaveZone(activeZone)">保存位置</button>
          </div>
          <div class="doors-row">
            <button v-for="d in activeZone.doors" :key="d.id" class="btn btn-xs" :class="d.open ? 'door-on' : 'door-off'" @click="() => { d.open = !d.open; handleToggleDoor({ id: activeZone!.id, doors: activeZone!.doors }) }">
              {{ d.id }}({{ d.side }}) · {{ d.open ? '开' : '关' }}
            </button>
          </div>
        </div>
        <CampusRoadPanel :items="roads" :selected-road-id="selectedRoadId" @select="(id) => { selectedRoadId = id; selectedZoneId = '' }" @create="async (b) => { await createCampusRoad(props.token, b); await refresh() }" @remove="async (id) => { await deleteCampusRoad(props.token, id); selectedRoadId = ''; await refresh() }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cm-shell { display: flex; flex-direction: column; gap: 10px; }
.cm-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #cbd5e1; }
.cm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.split { display: grid; grid-template-columns: 1.15fr 1fr; gap: 12px; align-items: start; }
.side-col { display: flex; flex-direction: column; gap: 12px; }
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
h4 { margin: 0; font-size: 13px; color: #f8fafc; }
.zone-tabs, .form-row, .doors-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lbl { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; }
.xs { width: 54px; }
.btn-xs { padding: 3px 7px; font-size: 11px; }
.door-on { background: #064e3b; border-color: #10b981; color: #a7f3d0; }
.door-off { background: #450a0a; border-color: #ef4444; color: #fecaca; }
.ok-box { margin: 0; padding: 6px 10px; border-radius: 6px; background: #064e3b; color: #a7f3d0; font-size: 12px; }
.err-box { margin: 0; padding: 6px 10px; border-radius: 6px; background: #450a0a; color: #fecaca; font-size: 12px; }
</style>
