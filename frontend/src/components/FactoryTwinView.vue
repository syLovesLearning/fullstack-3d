<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { listCargoTypes, listRacks, listRoads, listSlots } from '../api/client'
import { useFactoryScene, type CamPreset } from '../composables/useFactoryScene'

const props = defineProps<{ token: string; active: boolean }>()
const emit = defineEmits<{ openRack: [rackId: string] }>()
const boxEl = ref<HTMLElement | null>(null)
const rackCount = ref(0)
const slotCount = ref(0)
const syncing = ref(false)

const { stats, fps, drawCalls, triangles, matCount, highDpr, setCam, toggleQuality, setPaused, syncWarehouse3D } =
  useFactoryScene(boxEl, (rackId) => emit('openRack', rackId))

const presets: { key: CamPreset; label: string }[] = [
  { key: 'aisle', label: '通道内视角' },
  { key: 'bird', label: '厂区全景俯瞰' },
  { key: 'forklift', label: '叉车材质特写' },
  { key: 'rail', label: '预留轨道特写' },
  { key: 'ebox', label: '角落配电箱' },
  { key: 'fork', label: '托盘堆垛区' },
]

async function reload3DData() {
  if (!props.token) return
  syncing.value = true
  try {
    const [racks, roads, cargos, slots] = await Promise.all([
      listRacks(props.token), listRoads(props.token), listCargoTypes(props.token), listSlots(props.token),
    ])
    rackCount.value = racks.length
    slotCount.value = slots.filter((s) => s.status === 'available').length
    syncWarehouse3D(racks, roads, cargos, slots, '')
  } finally { syncing.value = false }
}

watch(() => props.active, (isActive) => {
  setPaused(!isActive)
  if (isActive) reload3DData()
})

onMounted(reload3DData)
</script>

<template>
  <div class="twin-wrap">
    <div class="twin-bar">
      <div>
        <strong>90m × 140m 工业厂区数字孪生</strong>
        <span v-if="stats" class="meta">货架 {{ rackCount }} 排 · 在库 {{ slotCount }} 位 · 轨面 {{ stats.railHeightM }}m（双击货架可直达维护）</span>
      </div>
      <div class="btns">
        <button class="btn" @click="toggleQuality">{{ highDpr ? '画质: 高清 2x' : '画质: 流畅 1.25x' }}</button>
        <button class="btn btn-primary" :disabled="syncing" @click="reload3DData">{{ syncing ? '同步中...' : '刷新 3D 数据' }}</button>
        <button v-for="p in presets" :key="p.key" class="btn" @click="setCam(p.key)">{{ p.label }}</button>
      </div>
    </div>

    <div class="hud">
      <span>FPS: <b>{{ fps }}</b></span>
      <span>DrawCalls: <b>{{ drawCalls }}</b></span>
      <span>面数: <b>{{ triangles.toLocaleString() }}</b></span>
      <span>共享材质池: <b>{{ matCount }} 个</b></span>
    </div>

    <div ref="boxEl" class="stage"></div>
  </div>
</template>

<style scoped>
.twin-wrap { display: flex; flex-direction: column; height: calc(100vh - 58px); background: #dbeafe; }
.twin-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #0f172a; color: #f8fafc; border-bottom: 1px solid #334155; gap: 12px; flex-wrap: wrap; }
.meta { margin-left: 12px; font-size: 12px; color: #94a3b8; }
.btns { display: flex; gap: 6px; flex-wrap: wrap; }
.hud { display: flex; gap: 18px; padding: 6px 16px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 12px; color: #cbd5e1; }
.hud b { color: #34d399; }
.stage { flex: 1; min-height: 0; }
</style>
