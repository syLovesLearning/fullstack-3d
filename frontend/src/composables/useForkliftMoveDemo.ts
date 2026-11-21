import { ref, type Ref } from 'vue'
import { updateSlot } from '../api/client'
import type { RackLayoutItem, SlotItem } from '../api/warehouseTypes'
import type { DemoStartResult } from '../utils/forkliftDemoRuntime'
import { planForkliftPath, planForkliftPathStrict } from '../utils/forkliftPath'

interface Options {
  token: () => string
  slots: Ref<SlotItem[]>
  racks: Ref<RackLayoutItem[]>
  selectedRack: Ref<RackLayoutItem | null>
  start: (racks: RackLayoutItem[], source: RackLayoutItem, dest: RackLayoutItem, color: string, callbacks: {
    onPickup?: () => void
    onDrop?: () => void
    onStatus?: (s: string) => void
    onDone?: () => void
  }) => DemoStartResult
  stop: () => void
  reload: () => Promise<void>
}

/** 3D 搬运演示交互：自动选源/目标货位、启动叉车动画并同步货位台账。 */
export function useForkliftMoveDemo(options: Options) {
  const demoStatus = ref('')
  const demoRunning = ref(false)
  let picked: SlotItem | null = null

  function findRoute(strict: boolean) {
    const selected = options.slots.value.find((s) => s.rack_id === options.selectedRack.value?.id && s.status === 'occupied' && s.cargo_type_code)
    const occupied = options.slots.value.filter((s) => s.status === 'occupied' && s.cargo_type_code)
    const seen = new Set<string>()
    const sources = (selected ? [selected, ...occupied] : occupied)
      .filter((s) => { if (seen.has(s.rack_id)) return false; seen.add(s.rack_id); return true })
      .slice(0, 4)

    for (const source of sources) {
      const sourceRack = options.racks.value.find((r) => r.id === source.rack_id)
      if (!sourceRack) continue
      const sameCargo = (slot: SlotItem) => options.racks.value.find((r) => r.id === slot.rack_id)?.cargo_type_code === sourceRack.cargo_type_code
      const dist = (slot: SlotItem) => {
        const r = options.racks.value.find((x) => x.id === slot.rack_id)
        return Math.hypot((r?.pos_x ?? 0) - sourceRack.pos_x, (r?.pos_z ?? 0) - sourceRack.pos_z)
      }
      const empties = options.slots.value
        .filter((s) => s.status === 'empty' && s.rack_id !== source.rack_id)
        .sort((a, b) => {
          if (sameCargo(a) !== sameCargo(b)) return sameCargo(a) ? -1 : 1
          return dist(a) - dist(b)
        })
        .slice(0, 5)
      for (const dest of empties) {
        const destRack = options.racks.value.find((r) => r.id === dest.rack_id)
        if (!destRack) continue
        const plan = strict
          ? planForkliftPathStrict(options.racks.value, sourceRack, destRack)
          : planForkliftPath(options.racks.value, sourceRack, destRack)
        if (plan) return { source, sourceRack, dest, destRack }
      }
    }
    return null
  }

  function pickRoute() {
    return findRoute(true) ?? findRoute(false)
  }

  async function pickup(source: SlotItem) {
    picked = source
    try {
      await updateSlot(options.token(), source.id, { status: 'empty' })
      await options.reload()
    } catch (e) {
      picked = null
      demoStatus.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function restoreSource(source: SlotItem) {
    picked = null
    try {
      await updateSlot(options.token(), source.id, {
        status: 'occupied', cargo_type_code: source.cargo_type_code, batch_no: source.batch_no,
      })
      await options.reload()
    } catch (e) {
      demoStatus.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function drop(source: SlotItem, dest: SlotItem) {
    try {
      await updateSlot(options.token(), dest.id, {
        status: 'occupied', cargo_type_code: source.cargo_type_code, batch_no: source.batch_no ?? 'DEMO-MOVE',
      })
      picked = null
      await options.reload()
    } catch (e) {
      demoStatus.value = e instanceof Error ? e.message : String(e)
      await restoreSource(source)
    }
  }

  function startDemo() {
    if (demoRunning.value) stopDemo()
    const route = pickRoute()
    if (!route) {
      demoStatus.value = '没有可搬运的占用货位或可放货的空货位'
      return
    }
    const res = options.start(options.racks.value, route.sourceRack, route.destRack, route.source.cargo_color_hex ?? '#d97706', {
      onPickup: () => { void pickup(route.source) },
      onDrop: () => { void drop(route.source, route.dest) },
      onStatus: (s) => { demoStatus.value = s },
      onDone: () => { picked = null; demoRunning.value = false },
    })
    if (!res.ok) {
      demoStatus.value = res.message ?? '路径规划失败'
      return
    }
    demoRunning.value = true
    demoStatus.value = `路线 ${route.sourceRack.code} → ${route.destRack.code} · 约 ${Math.round(res.distance ?? 0)}m`
  }

  function stopDemo() {
    if (picked) void restoreSource(picked)
    options.stop()
    demoRunning.value = false
    demoStatus.value = '已停止搬运演示'
  }

  return { demoStatus, demoRunning, startDemo, stopDemo }
}
