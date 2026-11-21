<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CargoTypeItem, RackLayoutItem } from '../api/warehouseTypes'
import { usePagination } from '../composables/usePagination'
import ListPagination from './ListPagination.vue'

const props = defineProps<{ items: RackLayoutItem[]; cargos: CargoTypeItem[]; selectedId: string }>()
const emit = defineEmits<{
  select: [id: string]
  edit: [rack: RackLayoutItem]
  remove: [id: string]
}>()

const keyword = ref('')
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.items
  return props.items.filter((r) =>
    [r.code, r.name, r.cargo_type_code ?? ''].some((v) => v.toLowerCase().includes(kw)))
})
const totalSlots = computed(() => props.items.reduce((acc, r) => acc + r.total_slots, 0))
const { page, pageSize, total, pagedItems, rangeStart, rangeEnd, setPage, setPageSize } =
  usePagination(filtered, 8)

// 搜索条件变化后回到第 1 页，避免停留在空白页
watch(keyword, () => setPage(1))

const cargoMap = computed(() => new Map(props.cargos.map((c) => [c.code, c])))
const cargoOf = (r: RackLayoutItem) => (r.cargo_type_code ? cargoMap.value.get(r.cargo_type_code) ?? null : null)
</script>

<template>
  <div class="sub-card">
    <div class="head-row">
      <h4>4. 货架清单（共 <b>{{ items.length }}</b> 排 · 合计 <b>{{ totalSlots.toLocaleString() }}</b> 库位）</h4>
      <input v-model="keyword" class="inp search" placeholder="搜索编码 / 名称 / 货品类型…" />
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th><th>名称</th><th>尺寸 (长×宽×高)</th><th>库位</th>
            <th>承重 (kg)</th><th>坐标 (X, Z)</th><th>角度</th><th>货品类型</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in pagedItems" :key="r.id"
            :class="{ active: r.id === selectedId }"
            @click="emit('select', r.id)"
          >
            <td><b>{{ r.code }}</b></td>
            <td>{{ r.name }}</td>
            <td>{{ r.length_m }} × {{ r.width_m }} × {{ r.height_m }} m</td>
            <td>{{ r.total_slots }}</td>
            <td>{{ r.max_load_kg.toLocaleString() }}</td>
            <td>({{ r.pos_x }}, {{ r.pos_z }})</td>
            <td>{{ r.rotation_deg }}°</td>
            <td>
              <template v-if="cargoOf(r)">
                <span class="dot" :style="{ background: cargoOf(r)!.color_hex }"></span>
                {{ cargoOf(r)!.name }}
              </template>
              <span v-else class="unbound">未绑定</span>
            </td>
            <td>
              <span class="ops">
                <button class="btn btn-xs" @click.stop="emit('edit', r)">改</button>
                <button class="btn btn-xs btn-danger" @click.stop="emit('remove', r.id)">删</button>
              </span>
            </td>
          </tr>
          <tr v-if="!total"><td colspan="9" class="empty">没有匹配的货架，试试其它关键字</td></tr>
        </tbody>
      </table>
    </div>
    <ListPagination
      :total="total" :page="page" :page-size="pageSize" :page-size-options="[5, 8, 15, 30]"
      @update:page="setPage" @update:page-size="setPageSize"
    />
    <span class="hint">显示 {{ rangeStart }}–{{ rangeEnd }} 条 · 点击行可在上方平面图中定位该货架</span>
  </div>
</template>

<style scoped>
.sub-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
.head-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
h4 { margin: 0; font-size: 13px; color: #f8fafc; }
h4 b { color: #38bdf8; }
.inp.search { width: 240px; background: #1e293b; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; padding: 5px 8px; font-size: 12px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; color: #94a3b8; font-weight: 500; padding: 6px 8px; border-bottom: 1px solid #334155; white-space: nowrap; }
td { padding: 6px 8px; border-bottom: 1px solid #1e293b; color: #e2e8f0; white-space: nowrap; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: #1e293b; }
tbody tr.active { background: #1e3a5f; box-shadow: inset 2px 0 0 #facc15; }
.empty { text-align: center; color: #64748b; padding: 14px; }
.ops { display: inline-flex; gap: 4px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.unbound { color: #64748b; }
.hint { display: block; margin-top: 4px; font-size: 11px; color: #64748b; }
.btn-xs { padding: 2px 8px; font-size: 11px; }
.btn-danger { background: #7f1d1d; border-color: #991b1b; }
</style>
