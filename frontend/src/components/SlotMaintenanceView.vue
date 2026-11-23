<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { batchSlots, mergeSlot, splitSlot, updateRackMeta, updateSlot } from '../api/client'
import type { AbcClass, CargoTypeItem, RackLayoutItem, SlotType, WarehouseSlotItem } from '../api/warehouseTypes'
import LevelMaintModal from './LevelMaintModal.vue'
import RackMetaModal from './RackMetaModal.vue'
import RackSingleFrontView from './RackSingleFrontView.vue'
import SlotDetailModal from './SlotDetailModal.vue'
import SlotDrilldownTable from './SlotDrilldownTable.vue'

const props = defineProps<{
  token: string
  racks: RackLayoutItem[]
  slots: WarehouseSlotItem[]
  cargos: CargoTypeItem[]
  focusRackId: string
}>()

const emit = defineEmits<{ refresh: [] }>()
const viewMode = ref<'split' | 'table'>('split')
const selectedRackId = ref('')
const focusBay = ref<number | null>(null)
const editingSlot = ref<WarehouseSlotItem | null>(null)
const editingRack = ref<RackLayoutItem | null>(null)
const editingLevel = ref<{ rack: RackLayoutItem; bayIdx: number; levelIdx?: number } | null>(null)
const detailErr = ref('')

watch(() => [props.focusRackId, props.racks.length] as const, ([fid]) => {
  if (fid) selectedRackId.value = fid
  else if (!selectedRackId.value && props.racks.length) selectedRackId.value = props.racks[0].id
}, { immediate: true })

const selectedRack = computed(() => props.racks.find((r) => r.id === selectedRackId.value) ?? props.racks[0] ?? null)
const slotRack = computed(() => props.racks.find((r) => r.id === editingSlot.value?.rack_id) ?? null)
const canMergeEditing = computed(() => {
  if (!editingSlot.value || editingSlot.value.status !== 'available' || editingSlot.value.span_slots !== 1) return false
  const nxt = props.slots.find((s) => s.rack_id === editingSlot.value!.rack_id && s.bay_idx === editingSlot.value!.bay_idx && s.level_idx === editingSlot.value!.level_idx && s.slot_idx === editingSlot.value!.slot_idx + 1)
  return !!nxt && nxt.status === 'available' && nxt.span_slots === 1
})

async function handleSaveSlot(p: { id: string; status: 'available' | 'locked' | 'disabled'; slot_type: SlotType; abc_class: AbcClass; allow_mixed: boolean; max_weight_kg: number; remark: string }) {
  detailErr.value = ''
  try { await updateSlot(props.token, p.id, p); editingSlot.value = null; emit('refresh') }
  catch (e) { detailErr.value = e instanceof Error ? e.message : String(e) }
}

async function handleSaveRackMeta(p: { id: string; name: string; max_load_kg: number; cargo_type_code: string | null }) {
  detailErr.value = ''
  try { await updateRackMeta(props.token, p.id, p.name, p.max_load_kg, p.cargo_type_code); editingRack.value = null; emit('refresh') }
  catch (e) { detailErr.value = e instanceof Error ? e.message : String(e) }
}

async function handleMerge(id: string) {
  detailErr.value = ''
  try { await mergeSlot(props.token, id); editingSlot.value = null; emit('refresh') }
  catch (e) { detailErr.value = e instanceof Error ? e.message : String(e) }
}

async function handleSplit(id: string) {
  detailErr.value = ''
  try { await splitSlot(props.token, id); editingSlot.value = null; emit('refresh') }
  catch (e) { detailErr.value = e instanceof Error ? e.message : String(e) }
}

async function handleBatch(p: { rack_id: string; bay_idx?: number; level_idx?: number; action: 'lock' | 'unlock' | 'disable' | 'set_abc' | 'set_type'; abc_class?: AbcClass; slot_type?: SlotType }) {
  await batchSlots(props.token, p); emit('refresh')
}
</script>

<template>
  <div class="slot-maint">
    <div class="top-ctrl">
      <div class="mode-grp">
        <button class="btn" :class="{ 'btn-primary': viewMode === 'split' }" @click="viewMode = 'split'">左正面图(2D/3D) + 右下钻表格</button>
        <button class="btn" :class="{ 'btn-primary': viewMode === 'table' }" @click="viewMode = 'table'">纯表格台账模式</button>
      </div>
      <div class="rack-sel">
        <span class="lbl">当前查看货架：</span>
        <select v-model="selectedRackId" class="inp" @change="focusBay = null">
          <option v-for="r in racks" :key="r.id" :value="r.id">{{ r.code }} · {{ r.name }}</option>
        </select>
        <button v-if="selectedRack" class="btn" @click="detailErr = ''; editingRack = selectedRack">维护当前货架</button>
      </div>
    </div>

    <div class="body-grid" :class="{ full: viewMode === 'table' }">
      <RackSingleFrontView
        v-if="viewMode === 'split'"
        :rack="selectedRack" :slots="slots" :focus-bay="focusBay"
        @open-detail="(s) => { detailErr = ''; editingSlot = s; focusBay = s.bay_idx }"
        @open-level="(p) => (editingLevel = p)"
        @open-rack="(r) => { detailErr = ''; editingRack = r }"
        @merge="handleMerge" @split="handleSplit" @quick-patch="handleSaveSlot"
      />
      <SlotDrilldownTable
        :racks="racks" :slots="slots" :selected-rack-id="selectedRackId" :full-mode="viewMode === 'table'"
        @select-rack="(id) => { selectedRackId = id; focusBay = null }"
        @focus-bay="(b) => (focusBay = b)"
        @open-detail="(s) => { detailErr = ''; editingSlot = s }"
        @open-rack="(r) => { detailErr = ''; editingRack = r }"
        @open-level="(p) => (editingLevel = p)"
        @merge="handleMerge" @split="handleSplit"
      />
    </div>

    <RackMetaModal :rack="editingRack" :cargos="cargos" :err-msg="detailErr" @close="editingRack = null" @save-meta="handleSaveRackMeta" @batch-rack="handleBatch" />
    <LevelMaintModal :target="editingLevel" :slots="slots" @close="editingLevel = null" @batch-apply="handleBatch" @merge-level="handleMerge" @split-level="handleSplit" />
    <SlotDetailModal :slot="editingSlot" :rack="slotRack" :can-merge="canMergeEditing" :err-msg="detailErr" @close="editingSlot = null" @save="handleSaveSlot" @merge="handleMerge" @split="handleSplit" />
  </div>
</template>

<style scoped>
.slot-maint { display: flex; flex-direction: column; gap: 12px; }
.top-ctrl { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; }
.mode-grp, .rack-sel { display: flex; align-items: center; gap: 8px; }
.lbl { font-size: 12px; color: #94a3b8; }
.inp { padding: 5px 8px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 12px; }
.body-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px; align-items: stretch; }
.body-grid.full { grid-template-columns: 1fr; }
</style>
