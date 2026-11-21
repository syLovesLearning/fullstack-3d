<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
}>()
const emit = defineEmits<{
  'update:page': [p: number]
  'update:pageSize': [s: number]
}>()

const options = computed(() => props.pageSizeOptions ?? [5, 10, 20])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < pageCount.value)
</script>

<template>
  <div class="pager">
    <span class="pg-total">共 <b>{{ total }}</b> 条</span>
    <label class="pg-size">
      每页
      <select :value="pageSize" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="s in options" :key="s" :value="s">{{ s }}</option>
      </select>
      条
    </label>
    <div class="pg-btns">
      <button class="btn btn-xs" :disabled="!canPrev" @click="emit('update:page', 1)">«</button>
      <button class="btn btn-xs" :disabled="!canPrev" @click="emit('update:page', page - 1)">‹</button>
      <span class="pg-num">{{ page }} / {{ pageCount }} 页</span>
      <button class="btn btn-xs" :disabled="!canNext" @click="emit('update:page', page + 1)">›</button>
      <button class="btn btn-xs" :disabled="!canNext" @click="emit('update:page', pageCount)">»</button>
    </div>
    <span v-if="total" class="pg-range">第 {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} 条</span>
  </div>
</template>

<style scoped>
.pager { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: #94a3b8; }
.pg-total b { color: #f8fafc; }
.pg-size { display: flex; align-items: center; gap: 4px; }
.pg-size select { background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; padding: 2px 4px; font-size: 11px; }
.pg-btns { display: flex; align-items: center; gap: 4px; }
.pg-num { color: #e2e8f0; min-width: 62px; text-align: center; }
.pg-range { margin-left: auto; }
.btn-xs { padding: 2px 8px; font-size: 11px; }
</style>
