export interface CargoTypeItem {
  id: string
  code: string
  name: string
  length_m: number
  width_m: number
  height_m: number
  weight_kg: number
  model_key: string
  color_hex: string
}

export interface RackLayoutItem {
  id: string
  code: string
  name: string
  length_m: number
  width_m: number
  height_m: number
  bays: number
  levels: number
  slots_per_bay: number
  total_slots: number
  max_load_kg: number
  pos_x: number
  pos_z: number
  rotation_deg: 0 | 90
  model_key: string
  cargo_type_code: string | null
}

export interface RoadZoneItem {
  id: string
  code: string
  name: string
  pos_x: number
  pos_z: number
  length_m: number
  width_m: number
  is_locked: boolean
  drivable_forklift: boolean
}

export type SlotStatus = 'available' | 'locked' | 'disabled' | 'merged'
export type SlotType = 'storage' | 'pick' | 'staging' | 'quarantine'
export type AbcClass = 'A' | 'B' | 'C'

export interface WarehouseSlotItem {
  id: string
  rack_id: string
  bay_idx: number
  level_idx: number
  slot_idx: number
  slot_code: string
  status: SlotStatus
  span_slots: number
  merged_into_slot_id: string | null
  slot_type: SlotType
  abc_class: AbcClass
  allow_mixed: boolean
  max_weight_kg: number
  remark: string
}

export interface CampusDoor {
  id: string
  side: 'top' | 'bottom' | 'left' | 'right'
  off: number
  open: boolean
}

export interface CampusSubSlot {
  kind: 'raw' | 'semi' | 'finished'
  rx: number
  ry: number
  init: number
}

export interface CampusZoneItem {
  id: string
  code: string
  name: string
  zone_type: 'warehouse' | 'dock'
  x: number
  y: number
  w: number
  h: number
  color: string
  doors: CampusDoor[]
  sub_layout: CampusSubSlot[]
}

export interface CampusRoadItem {
  id: string
  code: string
  name: string
  x: number
  y: number
  w: number
  h: number
  is_locked: boolean
}
