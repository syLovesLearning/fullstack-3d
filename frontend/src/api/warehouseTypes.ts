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
<<<<<<< HEAD

export type SlotStatus = 'empty' | 'occupied' | 'maintenance' | 'locked'

export interface SlotItem {
  id: string
  rack_id: string
  rack_code: string
  code: string
  bay_no: number
  level_no: number
  slot_no: number
  status: SlotStatus
  cargo_type_code: string | null
  cargo_name: string | null
  cargo_color_hex: string | null
  batch_no: string | null
}

export interface SlotUpdateBody {
  status?: SlotStatus
  cargo_type_code?: string | null
  batch_no?: string | null
}

export interface SlotStats {
  total: number
  occupied: number
  empty: number
  maintenance: number
  locked: number
  occupancy_rate: number
}

export interface SlotSyncResult {
  created: number
  removed: number
  total: number
}

export interface LayoutRandomizeResult {
  racks: number
  roads: number
  total_slots: number
  occupied_slots: number
}
=======
>>>>>>> ini
