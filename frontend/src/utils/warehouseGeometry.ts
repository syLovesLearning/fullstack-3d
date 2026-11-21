import type { RackLayoutItem, RoadZoneItem } from '../api/warehouseTypes'

export const PLANT_W = 90
export const PLANT_L = 140

export const RACK_MODEL_OPTIONS = [
  { key: 'rack_heavy_4l', label: '重型横梁货架 (4层标准)' },
  { key: 'rack_cantilever', label: '悬臂式线缆货架' },
  { key: 'rack_drive_in', label: '贯通式托盘货架' },
]

export const CARGO_MODEL_OPTIONS = [
  { key: 'cargo_carton', label: '牛皮纸箱托盘 (3D Box)' },
  { key: 'cargo_crate', label: '蓝周转箱组 (3D Crate)' },
  { key: 'cargo_drum', label: '金属化工圆桶 (3D Drum)' },
  { key: 'cargo_reel', label: '成品电缆木盘 (3D Reel)' },
]

export function getRackFootprint(rack: Pick<RackLayoutItem, 'length_m' | 'width_m' | 'rotation_deg'>) {
  return rack.rotation_deg === 90
    ? { spanX: rack.length_m, spanZ: rack.width_m }
    : { spanX: rack.width_m, spanZ: rack.length_m }
}

function overlaps(
  ax: number, az: number, aw: number, al: number,
  bx: number, bz: number, bw: number, bl: number,
): boolean {
  return Math.abs(ax - bx) * 2 < aw + bw - 0.05 && Math.abs(az - bz) * 2 < al + bl - 0.05
}

export function checkRackPlacementConflict(
  candidate: { id?: string; pos_x: number; pos_z: number; length_m: number; width_m: number; rotation_deg: 0 | 90 },
  racks: RackLayoutItem[],
  roads: RoadZoneItem[],
): string | null {
  const { spanX, spanZ } = getRackFootprint(candidate)
  if (Math.abs(candidate.pos_x) + spanX / 2 > PLANT_W / 2 - 0.8 || Math.abs(candidate.pos_z) + spanZ / 2 > PLANT_L / 2 - 0.8) {
    return '超出厂区围墙安全边界'
  }
  for (const road of roads) {
    if (overlaps(candidate.pos_x, candidate.pos_z, spanX, spanZ, road.pos_x, road.pos_z, road.width_m, road.length_m)) {
      return `与固定道路 [${road.name}] 冲突`
    }
  }
  for (const other of racks) {
    if (other.id === candidate.id) continue
    const oSpan = getRackFootprint(other)
    if (overlaps(candidate.pos_x, candidate.pos_z, spanX, spanZ, other.pos_x, other.pos_z, oSpan.spanX, oSpan.spanZ)) {
      return `与货架 [${other.code}] 重叠`
    }
  }
  return null
}
