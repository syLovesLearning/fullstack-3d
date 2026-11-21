<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CargoTypeItem, RackLayoutItem, SlotItem, SlotStatus, SlotUpdateBody } from '../api/warehouseTypes'

const props = defineProps<{ rack: RackLayoutItem; slots: SlotItem[]; cargos: CargoTypeItem[]; syncing?: boolean }>()
const emit = defineEmits<{
  sync: [rackId: string]
  update: [slotId: string, body: SlotUpdateBody]
}>()

const levels = computed(() => [...new Set(props.slots.map((s) => s.level_no))].sort((a, b) => b - a))
const activeLevel = ref(0)
const selectedId = ref('')
const formStatus = ref<SlotStatus>('empty')
const formCargo = ref('')
const formBatch = ref('')

const levelSlots = computed(() => props.slots.filter((s) => s.level_no === activeLevel.value))
const slotMap = computed(() => new Map(levelSlots.value.map((s) => [`${s.bay_no}-${s.slot_no}`, s])))
const activeSlot = computed(() => props.slots.find((s) => s.id === selectedId.value) ?? null)
const occupied = computed(() => props.slots.filter((s) => s.status === 'occupied').length)
const rate = computed(() => (props.slots.length ? Math.round((occupied.value * 100) / props.slots.length) : 0))

watch(() => props.rack.id, () => { selectedId.value = ''; activeLevel.value = levels.value[0] ?? 0 })
watch(levels, (v) => { if (!v.includes(activeLevel.value)) activeLevel.value = v[0] ?? 0 })
watch(activeSlot, (s) => {
  formStatus.value = s?.status ?? 'empty'
  formCargo.value = s?.cargo_type_code ?? ''
  formBatch.value = s?.batch_no ?? ''
})

function pick(slot: SlotItem | undefined) { if (slot) selectedId.value = slot.id }

function save() {
  if (!activeSlot.value) return
  const status = formStatus.value
  const body: SlotUpdateBody = {
    status,
    cargo_type_code: status === 'empty' ? null : (formCargo.value || null),
    batch_no: status === 'empty' ? null : (formBatch.value.trim() || null),
  }
  emit('update', activeSlot.value.id, body)
}

function clearSlot() {
  if (activeSlot.value) emit('update', activeSlot.value.id, { status: 'empty' })
}

function chipClass(s: SlotItem | undefined) { return s ? `st-${s.status}` : 'st-missing' }
function chipLabel(s: SlotItem | undefined) { return s ? s.slot_no + 1 : '-' }
function chipStyle(s: SlotItem | undefined) {
  if (!s || s.status !== 'occupied' || !s.cargo_color_hex) return {}
  return { background: s.cargo_color_hex, borderColor: s.cargo_color_hex }
}
</script>

<template>
  <div class="sub-card ledger">
    <div class="head-row">
      <h4>6. 货位台账 <span class="rack-code">{{ rack.code }}</span> · {{ rack.name }}</h4>
      <div class="head-actions">
        <span class="occ">已占 <b>{{ occupied }}</b> / {{ slots.length }}（{{ rate }}%）</span>
        <button class="btn btn-primary btn-xs" :disabled="syncing" @click="emit('sync', rack.id)">
          {{ syncing ? '同步中...' : '同步库位' }}
        </button>
      </div>
    </div>
    <div class="bar"><div class="fill" :style="{ width: `${rate}%` }"></div></div>

    <div class="legend">
      <span><i class="dot occ-dot"></i>占用</span>
      <span><i class="dot empty-dot"></i>空货位</span>
      <span><i class="dot maint-dot"></i>维护中</span>
      <span><i class="dot locked-dot"></i>锁定</span>
    </div>

    <p v-if="!slots.length" class="hint">该货架还没有货位台账，点击「同步库位」按 {{ rack.bays }}×{{ rack.levels }}×{{ rack.slots_per_bay }} 自动生成。</p>

    <template v-else>
      <div class="levels">
        <button v-for="l in levels" :key="l" class="btn btn-xs" :class="{ 'btn-primary': l === activeLevel }" @click="activeLevel = l">
          {{ l + 1 }} 层
        </button>
      </div>

      <div class="bay-grid">
        <div v-for="b in rack.bays" :key="b" class="bay">
          <span class="bay-label">货格 {{ b }}</span>
          <div class="chips">
            <button
              v-for="s in rack.slots_per_bay" :key="s"
              class="chip" :class="[chipClass(slotMap.get(`${b - 1}-${s - 1}`)), { active: slotMap.get(`${b - 1}-${s - 1}`)?.id === selectedId }]"
              :style="chipStyle(slotMap.get(`${b - 1}-${s - 1}`))"
              :title="slotMap.get(`${b - 1}-${s - 1}`)?.code ?? '未同步货位'"
              @click="pick(slotMap.get(`${b - 1}-${s - 1}`))"
            >
              {{ chipLabel(slotMap.get(`${b - 1}-${s - 1}`)) }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeSlot" class="editor">
        <b class="slot-code">{{ activeSlot.code }}</b>
        <label class="lbl">状态
          <select v-model="formStatus" class="inp">
            <option value="empty">空货位</option>
            <option value="occupied">占用</option>
            <option value="maintenance">维护中</option>
            <option value="locked">锁定</option>
          </select>
        </label>
        <label class="lbl">货品
          <select v-model="formCargo" class="inp" :disabled="formStatus === 'empty'">
            <option value="">未绑定</option>
            <option v-for="c in cargos" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
          </select>
        </label>
        <label class="lbl">批次
          <input v-model="formBatch" class="inp" :disabled="formStatus === 'empty'" placeholder="如 B-20261119" />
        </label>
        <button class="btn btn-primary btn-xs" @click="save">保存货位</button>
        <button class="btn btn-xs btn-danger" :disabled="!activeSlot" @click="clearSlot">清空</button>
      </div>
      <p v-else class="hint">点击上方任一货位查看编码、状态、货品与批次。</p>
    </template>
  </div>
</template>

<style scoped>
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
.head-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-actions { display: flex; align-items: center; gap: 10px; }
h4 { margin: 0; font-size: 13px; color: #f8fafc; }
.rack-code { color: #38bdf8; }
.occ { font-size: 12px; color: #cbd5e1; }
.occ b { color: #34d399; }
.bar { height: 6px; margin: 8px 0; border-radius: 999px; background: #1e293b; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.2s; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.dot { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
.occ-dot { background: #d97706; } .empty-dot { border: 1px dashed #64748b; } .maint-dot { background: #facc15; } .locked-dot { background: #ef4444; }
.levels { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.bay-grid { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; }
.bay { min-width: 74px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 5px 6px; }
.bay-label { display: block; font-size: 10px; color: #94a3b8; margin-bottom: 4px; white-space: nowrap; }
.chips { display: flex; flex-direction: column; gap: 4px; }
.chip { height: 20px; border-radius: 3px; border: 1px solid #475569; background: #0f172a; color: #cbd5e1; font-size: 10px; cursor: pointer; padding: 0; }
.chip.st-empty { border-style: dashed; background: #0b1120; color: #64748b; }
.chip.st-maintenance { background: #facc15; border-color: #eab308; color: #422006; }
.chip.st-locked { background: #ef4444; border-color: #dc2626; color: #fff; }
.chip.st-missing { border-style: dotted; color: #475569; cursor: default; }
.chip.st-occupied { color: #fff; }
.chip.active { outline: 2px solid #facc15; outline-offset: 1px; }
.editor { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; }
.slot-code { font-size: 12px; color: #fbbf24; }
.lbl { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
.inp { padding: 4px 7px; border-radius: 5px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 12px; }
.inp:disabled { opacity: 0.5; }
.hint { margin: 4px 0 0; font-size: 11px; color: #64748b; }
.btn-xs { padding: 2px 8px; font-size: 11px; }
.btn-danger { background: #7f1d1d; border-color: #991b1b; }
</style>
