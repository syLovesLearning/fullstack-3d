import { computed, ref, watch } from 'vue'

/**
 * 通用前端分页：传入列表的 ref / computed / toRef，输出当前页切片。
 * 列表长度或每页条数变化后自动把页码夹回合法范围（删除数据不空白）。
 */
export function usePagination<T>(items: { readonly value: T[] }, defaultPageSize = 5) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const total = computed(() => items.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })
  const rangeStart = computed(() => (total.value ? (page.value - 1) * pageSize.value + 1 : 0))
  const rangeEnd = computed(() => Math.min(page.value * pageSize.value, total.value))

  watch([total, pageSize], () => {
    if (page.value > pageCount.value) page.value = pageCount.value
  })

  function setPage(p: number) {
    page.value = Math.min(Math.max(1, p), pageCount.value)
  }
  function setPageSize(s: number) {
    pageSize.value = s
    page.value = 1
  }
  return { page, pageSize, total, pageCount, pagedItems, rangeStart, rangeEnd, setPage, setPageSize }
}
