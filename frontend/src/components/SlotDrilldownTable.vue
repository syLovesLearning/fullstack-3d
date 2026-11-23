<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AbcClass, RackLayoutItem, SlotStatus, WarehouseSlotItem } from '../api/warehouseTypes'

const props = defineProps<{
  racks: RackLayoutItem[]
  slots: WarehouseSlotItem[]
  selectedRackId: string
  fullMode: boolean
}>()

const emit = defineEmits<{
  selectRack: [rackId: string]
  focusBay: [bayIdx: number | null]
  openDetail: [slot: WarehouseSlotItem]
  openRack: [rack: RackLayoutItem]
  openLevel: [payload: { rack: RackLayoutItem; bayIdx: number; levelIdx?: number }]
  merge: [slotId: string]
  split: [slotId: string]
}>()

const activeRackId = ref('')
const activeBay = ref<number | null>(null)
const activeLevel = ref<number | null>(null)
const keyword = ref('')
const statusFilter = ref<'all' | SlotStatus>('all')
const abcFilter = ref<'all' | AbcClass>('all')

watch(() => props.selectedRackId, (id) => {
  if (id && id !== activeRackId.value) { activeRackId.value = id; activeBay.value = null; activeLevel.value = null }
}, { immediate: true })

const currentRack = computed(() => props.racks.find((r) => r.id === activeRackId.value) ?? null)
const rackSlots = computed(() => props.slots.filter((s) => s.rack_id === activeRackId.value))
const slotIndex = computed(() => new Map(props.slots.map((s) => [`${s.rack_id}:${s.bay_idx}:${s.level_idx}:${s.slot_idx}`, s])))

function canMergeNext(s: WarehouseSlotItem) {
  if (s.status !== 'available' || s.span_slots !== 1) return false
  const nxt = slotIndex.value.get(`${s.rack_id}:${s.bay_idx}:${s.level_idx}:${s.slot_idx + 1}`)
  return !!nxt && nxt.status === 'available' && nxt.span_slots === 1
}

const rackRows = computed(() => props.racks.map((r) => {
  const rs = props.slots.filter((s) => s.rack_id === r.id)
  return { rack: r, avail: rs.filter((s) => s.status === 'available').length, merged: rs.filter((s) => s.span_slots === 2).length, total: rs.length || r.total_slots }
}))

const bayRows = computed(() => {
  if (!currentRack.value) return []
  return Array.from({ length: currentRack.value.bays }, (_, i) => i + 1).map((b) => {
    const bs = rackSlots.value.filter((s) => s.bay_idx === b)
    return { bay: b, avail: bs.filter((s) => s.status === 'available').length, merged: bs.filter((s) => s.span_slots === 2).length, total: bs.length }
  })
})

const levelRows = computed(() => {
  if (!currentRack.value || !activeBay.value) return []
  return Array.from({ length: currentRack.value.levels }, (_, i) => currentRack.value!.levels - i).map((lv) => {
    const ls = rackSlots.value.filter((s) => s.bay_idx === activeBay.value && s.level_idx === lv)
    return { level: lv, avail: ls.filter((s) => s.status === 'available').length, merged: ls.filter((s) => s.span_slots === 2).length, total: ls.length }
  })
})

const slotRows = computed(() => {
  let list = props.slots
  if (activeRackId.value) list = list.filter((s) => s.rack_id === activeRackId.value)
  if (activeBay.value) list = list.filter((s) => s.bay_idx === activeBay.value)
  if (activeLevel.value) list = list.filter((s) => s.level_idx === activeLevel.value)
  if (statusFilter.value !== 'all') list = list.filter((s) => s.status === statusFilter.value)
  if (abcFilter.value !== 'all') list = list.filter((s) => s.abc_class === abcFilter.value)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter((s) => s.slot_code.toLowerCase().includes(kw) || s.remark.toLowerCase().includes(kw))
  return list
})

const showDirectSlots = computed(() => !!activeLevel.value || !!keyword.value.trim() || statusFilter.value !== 'all' || abcFilter.value !== 'all')
function enterRack(r: RackLayoutItem) { activeRackId.value = r.id; activeBay.value = null; activeLevel.value = null; emit('selectRack', r.id); emit('focusBay', null) }
function enterBay(b: number) { activeBay.value = b; activeLevel.value = null; emit('focusBay', b) }
</script>

<template>
  <div class="drill-wrap" :class="{ full: fullMode }">
    <div class="crumb-bar">
      <button class="crumb" @click="activeRackId = ''; activeBay = null; activeLevel = null; emit('focusBay', null)">全部货架 ({{ racks.length }})</button>
      <template v-if="currentRack"><span>/</span><button class="crumb" @click="activeBay = null; activeLevel = null; emit('focusBay', null)">{{ currentRack.code }}</button></template>
      <template v-if="activeBay"><span>/</span><button class="crumb" @click="activeLevel = null">B{{ String(activeBay).padStart(2, '0') }}</button></template>
      <template v-if="activeLevel"><span>/</span><span class="crumb-cur">L{{ activeLevel }}</span></template>
    </div>

    <div class="filter-bar">
      <input v-model="keyword" class="inp" placeholder="搜库位编码 / 备注..." />
      <select v-model="abcFilter" class="inp xs"><option value="all">ABC</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
      <select v-model="statusFilter" class="inp sm">
        <option value="all">全部状态</option><option value="available">可用</option><option value="locked">锁定</option><option value="disabled">停用</option><option value="merged">已并入</option>
      </select>
    </div>

    <div class="tbl-scroll">
      <table v-if="showDirectSlots" class="tbl">
        <thead><tr><th>库位 (双击维护)</th><th>跨度</th><th>类型 / ABC</th><th>限重</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="s in slotRows.slice(0, 120)" :key="s.id" class="click-row" @dblclick="s.status !== 'merged' && emit('openDetail', s)">
            <td><code>{{ s.slot_code }}</code></td>
            <td><span class="badge" :class="s.span_slots === 2 ? 'badge-blue' : 'badge-ok'">{{ s.span_slots === 2 ? '2格合并' : '1格' }}</span></td>
            <td>{{ s.slot_type }} · <b>{{ s.abc_class }}</b></td>
            <td>{{ s.max_weight_kg }}kg</td>
            <td>{{ s.status }}</td>
            <td class="ops">
              <button v-if="s.span_slots === 2" class="btn btn-xs" @click="emit('split', s.id)">拆分</button>
              <button v-else-if="canMergeNext(s)" class="btn btn-xs btn-primary" @click="emit('merge', s.id)">合并下一位</button>
              <button v-if="s.status !== 'merged'" class="btn btn-xs" @click="emit('openDetail', s)">维护</button>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="currentRack && activeBay" class="tbl">
        <thead><tr><th>层级</th><th>可用/合并/总位</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="lv in levelRows" :key="lv.level" class="click-row" @click="activeLevel = lv.level">
            <td><strong>L{{ lv.level }} 层</strong></td><td>{{ lv.avail }} / {{ lv.merged }}并 / {{ lv.total }}</td>
            <td class="ops" @click.stop>
              <button class="btn btn-xs" @click="activeLevel = lv.level">明细</button>
              <button class="btn btn-xs btn-primary" @click="emit('openLevel', { rack: currentRack, bayIdx: activeBay, levelIdx: lv.level })">维护层</button>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="currentRack" class="tbl">
        <thead><tr><th>跨位</th><th>可用/合并/总位</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="b in bayRows" :key="b.bay" class="click-row" @click="enterBay(b.bay)">
            <td><strong>B{{ String(b.bay).padStart(2, '0') }} 跨</strong></td><td>{{ b.avail }} / {{ b.merged }}并 / {{ b.total }}</td>
            <td class="ops" @click.stop>
              <button class="btn btn-xs" @click="enterBay(b.bay)">下钻</button>
              <button class="btn btn-xs btn-primary" @click="emit('openLevel', { rack: currentRack, bayIdx: b.bay })">维护跨</button>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="tbl">
        <thead><tr><th>货架排</th><th>可用/合并/总位</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in rackRows" :key="row.rack.id" class="click-row" @click="enterRack(row.rack)">
            <td><strong>{{ row.rack.code }}</strong> <small class="sub">{{ row.rack.name }}</small></td>
            <td>{{ row.avail }} / {{ row.merged }}并 / {{ row.total }}</td>
            <td class="ops" @click.stop>
              <button class="btn btn-xs btn-primary" @click="enterRack(row.rack)">正面图 + 下钻</button>
              <button class="btn btn-xs" @click="emit('openRack', row.rack)">维护架</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.drill-wrap { display: flex; flex-direction: column; height: 100%; min-height: 520px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden; color: #e2e8f0; }
.drill-wrap.full { width: 100%; }
.crumb-bar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 12px; flex-wrap: wrap; }
.crumb { background: none; border: none; color: #60a5fa; cursor: pointer; padding: 0; font-size: 12px; font-weight: 600; }
.crumb-cur { color: #f8fafc; font-weight: 600; }
.filter-bar { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #1e293b; }
.inp { flex: 1; padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; }
.xs { flex: 0 0 64px; } .sm { flex: 0 0 92px; }
.tbl-scroll { flex: 1; overflow: auto; max-height: 560px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th, .tbl td { padding: 7px 10px; border-bottom: 1px solid #1e293b; text-align: left; }
.tbl th { position: sticky; top: 0; background: #1e293b; color: #94a3b8; font-weight: 500; }
.click-row { cursor: pointer; } .click-row:hover { background: #1e293b; }
.sub { color: #94a3b8; font-size: 11px; margin-left: 4px; }
.ops { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-xs { padding: 2px 7px; font-size: 11px; }
</style>
