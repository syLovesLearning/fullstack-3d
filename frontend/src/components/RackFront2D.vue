<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AbcClass, RackLayoutItem, SlotType, WarehouseSlotItem } from '../api/warehouseTypes'

const props = defineProps<{
  rack: RackLayoutItem | null
  slots: WarehouseSlotItem[]
  focusBay: number | null
}>()

const emit = defineEmits<{
  openDetail: [slot: WarehouseSlotItem]
  openLevel: [payload: { rack: RackLayoutItem; bayIdx: number; levelIdx?: number }]
  merge: [slotId: string]
  split: [slotId: string]
  quickPatch: [payload: { id: string; status: 'available' | 'locked' | 'disabled'; slot_type: SlotType; abc_class: AbcClass; allow_mixed: boolean; max_weight_kg: number; remark: string }]
}>()

const menu = ref<{ slot: WarehouseSlotItem; x: number; y: number } | null>(null)
const rackSlots = computed(() => (props.rack ? props.slots.filter((s) => s.rack_id === props.rack!.id) : []))
const slotMap = computed(() => new Map(rackSlots.value.map((s) => [`${s.bay_idx}:${s.level_idx}:${s.slot_idx}`, s])))
const bays = computed(() => (props.rack ? Array.from({ length: props.rack.bays }, (_, i) => i + 1) : []))
const levels = computed(() => (props.rack ? Array.from({ length: props.rack.levels }, (_, i) => props.rack!.levels - i) : []))
const slotCols = computed(() => (props.rack ? Array.from({ length: props.rack.slots_per_bay }, (_, i) => i + 1) : []))

function getLevelSlots(b: number, lv: number) {
  const res: WarehouseSlotItem[] = []
  for (const sIdx of slotCols.value) {
    const rec = slotMap.value.get(`${b}:${lv}:${sIdx}`)
    if (rec && rec.status !== 'merged') res.push(rec)
  }
  return res
}

function canMergeNext(s: WarehouseSlotItem) {
  if (s.status !== 'available' || s.span_slots !== 1) return false
  const nxt = slotMap.value.get(`${s.bay_idx}:${s.level_idx}:${s.slot_idx + 1}`)
  return !!nxt && nxt.status === 'available' && nxt.span_slots === 1
}

function openMenu(e: MouseEvent, slot: WarehouseSlotItem) {
  const x = Math.min(e.clientX, window.innerWidth - 190)
  const y = Math.min(e.clientY, window.innerHeight - 250)
  menu.value = { slot, x, y }
}

function patchQuick(s: WarehouseSlotItem, overrides: Partial<{ status: 'available' | 'locked' | 'disabled'; abc_class: AbcClass }>) {
  const st = overrides.status ?? (s.status === 'merged' ? 'available' : s.status)
  emit('quickPatch', {
    id: s.id, status: st, slot_type: s.slot_type, abc_class: overrides.abc_class ?? s.abc_class,
    allow_mixed: s.allow_mixed, max_weight_kg: s.max_weight_kg, remark: s.remark,
  })
  menu.value = null
}

const closeMenu = () => { menu.value = null }
onMounted(() => window.addEventListener('click', closeMenu))
onBeforeUnmount(() => window.removeEventListener('click', closeMenu))
</script>

<template>
  <div class="front2d" @contextmenu.prevent>
    <div v-if="!rack" class="empty">暂无货架数据</div>
    <div v-else class="bays-scroll">
      <div class="bays-row">
        <div v-for="b in bays" :key="b" class="bay-col" :class="{ focused: focusBay === b }">
          <button class="bay-hdr" title="点击维护整跨" @click="emit('openLevel', { rack, bayIdx: b })">B{{ String(b).padStart(2, '0') }} 跨 ⚙</button>
          <div v-for="lv in levels" :key="lv" class="level-beam">
            <button class="lv-tag" title="点击维护整层" @click="emit('openLevel', { rack, bayIdx: b, levelIdx: lv })">L{{ lv }} 层维护 ⚙</button>
            <div class="slot-grid" :style="{ gridTemplateColumns: `repeat(${rack.slots_per_bay}, minmax(66px, 1fr))` }">
              <div
                v-for="s in getLevelSlots(b, lv)"
                :key="s.id"
                class="slot-cell"
                :class="[s.status, { merged2: s.span_slots === 2 }]"
                :style="{ gridColumn: `span ${s.span_slots}` }"
                @click="emit('openDetail', s)"
                @contextmenu.prevent.stop="openMenu($event, s)"
              >
                <div class="cell-top"><b>P{{ s.slot_idx }}{{ s.span_slots === 2 ? '+P' + (s.slot_idx + 1) : '' }}</b><span class="abc">{{ s.abc_class }}</span></div>
                <div class="cell-mid">{{ s.span_slots === 2 ? '2格合并' : s.slot_type }}</div>
                <div class="cell-bot">{{ s.max_weight_kg }}kg</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="menu" class="ctx-menu" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }" @click.stop>
      <div class="ctx-title">{{ menu.slot.slot_code }}</div>
      <button class="ctx-item" @click="emit('openDetail', menu.slot); menu = null">维护库位属性</button>
      <button class="ctx-item" @click="rack && emit('openLevel', { rack, bayIdx: menu.slot.bay_idx, levelIdx: menu.slot.level_idx }); menu = null">维护所在层 (L{{ menu.slot.level_idx }})</button>
      <button v-if="menu.slot.span_slots === 2" class="ctx-item" @click="emit('split', menu.slot.id); menu = null">拆分为 2 个库位</button>
      <button v-else-if="canMergeNext(menu.slot)" class="ctx-item primary" @click="emit('merge', menu.slot.id); menu = null">合并下一位 (2格)</button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="patchQuick(menu.slot, { status: 'available' })">设为可用</button>
      <button class="ctx-item" @click="patchQuick(menu.slot, { status: 'locked' })">锁定盘点</button>
      <button class="ctx-item danger" @click="patchQuick(menu.slot, { status: 'disabled' })">维修停用</button>
      <div class="ctx-sep"></div>
      <div class="ctx-abc">
        <span>ABC：</span>
        <button class="ctx-tag" @click="patchQuick(menu.slot, { abc_class: 'A' })">A</button>
        <button class="ctx-tag" @click="patchQuick(menu.slot, { abc_class: 'B' })">B</button>
        <button class="ctx-tag" @click="patchQuick(menu.slot, { abc_class: 'C' })">C</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.front2d { flex: 1; min-height: 0; display: flex; flex-direction: column; background: #0b1120; padding: 10px; overflow: hidden; }
.empty { color: #94a3b8; font-size: 13px; margin: auto; }
.bays-scroll { flex: 1; overflow: auto; }
.bays-row { display: flex; gap: 8px; min-height: 100%; align-items: stretch; }
.bay-col { flex: 0 0 156px; display: flex; flex-direction: column; gap: 6px; border: 2px solid #1e40af; background: #0f172a; padding: 6px; border-radius: 4px; }
.bay-col.focused { border-color: #38bdf8; box-shadow: 0 0 0 1px #38bdf8; }
.bay-hdr { background: none; border: none; border-bottom: 1px solid #1e293b; text-align: center; font-size: 12px; font-weight: 600; color: #93c5fd; padding-bottom: 4px; cursor: pointer; }
.bay-hdr:hover { color: #fff; }
.level-beam { display: flex; flex-direction: column; gap: 4px; border-bottom: 3px solid #ea580c; padding-bottom: 6px; }
.lv-tag { background: none; border: none; text-align: left; padding: 0; font-size: 10px; color: #94a3b8; cursor: pointer; }
.lv-tag:hover { color: #60a5fa; }
.slot-grid { display: grid; gap: 4px; }
.slot-cell { padding: 5px 6px; border-radius: 4px; cursor: pointer; border: 1px solid #475569; background: #1e293b; font-size: 11px; transition: transform 0.1s; user-select: none; }
.slot-cell:hover { border-color: #60a5fa; transform: translateY(-1px); }
.slot-cell.available { border-color: #854d0e; background: rgba(214, 181, 136, 0.16); color: #fef3c7; }
.slot-cell.merged2 { border-color: #2563eb; background: rgba(37, 99, 235, 0.28); color: #dbeafe; }
.slot-cell.locked { border-color: #ca8a04; background: rgba(234, 179, 8, 0.24); color: #fef08a; }
.slot-cell.disabled { border-color: #dc2626; background: rgba(220, 38, 38, 0.22); color: #fecaca; }
.cell-top { display: flex; justify-content: space-between; align-items: center; }
.abc { font-size: 10px; padding: 0 4px; border-radius: 3px; background: rgba(15, 23, 42, 0.7); }
.cell-mid { font-size: 10px; color: #cbd5e1; margin-top: 2px; }
.cell-bot { font-size: 10px; color: #94a3b8; }
.ctx-menu { position: fixed; z-index: 80; width: 185px; background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.45); display: flex; flex-direction: column; gap: 2px; }
.ctx-title { font-size: 11px; color: #94a3b8; padding: 4px 8px; font-family: monospace; border-bottom: 1px solid #334155; margin-bottom: 2px; }
.ctx-item { text-align: left; background: none; border: none; color: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.ctx-item:hover { background: #334155; }
.ctx-item.primary { color: #60a5fa; font-weight: 600; }
.ctx-item.danger { color: #fca5a5; }
.ctx-sep { height: 1px; background: #334155; margin: 3px 0; }
.ctx-abc { display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11px; color: #94a3b8; }
.ctx-tag { border: 1px solid #475569; background: #0f172a; color: #e2e8f0; border-radius: 4px; padding: 2px 7px; cursor: pointer; font-size: 11px; }
.ctx-tag:hover { background: #2563eb; border-color: #2563eb; }
</style>
