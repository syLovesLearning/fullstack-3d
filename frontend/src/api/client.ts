import type {
  AbcClass, CampusDoor, CampusRoadItem, CampusZoneItem, CargoTypeItem, RackLayoutItem, RoadZoneItem, SlotType, WarehouseSlotItem,
} from './warehouseTypes'

export type {
  AbcClass, CampusDoor, CampusRoadItem, CampusSubSlot, CampusZoneItem, CargoTypeItem, RackLayoutItem, RoadZoneItem, SlotStatus, SlotType, WarehouseSlotItem,
} from './warehouseTypes'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export interface UserInfo {
  user_id?: string
  id?: string
  username: string
  role: 'admin' | 'user' | 'readonly' | 'external_guest'
  allowed_tools: string[]
  groups: string[]
}

export interface AuthResponse { access_token: string; token_type: string; user: UserInfo }
export interface RawApiResult { status: number; ok: boolean; latencyMs: number; bodyText: string }

async function requestJson<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((options.headers as Record<string, string>) || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (!resp.ok) {
    const text = await resp.text()
    let detail = text || resp.statusText
    try { detail = JSON.parse(text).detail || detail } catch { /* keep raw */ }
    throw new Error(`${resp.status}: ${detail}`)
  }
  return resp.json() as Promise<T>
}

export const devLogin = (username = 'shenyang', role: UserInfo['role'] = 'admin', groups?: string[]) =>
  requestJson<AuthResponse>('/api/v1/auth/dev-login', { method: 'POST', body: JSON.stringify({ username, role, groups }) })
export const registerUser = (username: string, password: string, role: UserInfo['role'], groups: string[]) =>
  requestJson<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ username, password, role, groups }) })
export const loginUser = (username: string, password: string) =>
  requestJson<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
export const getMe = (token: string) =>
  requestJson<UserInfo>('/api/v1/auth/me', { method: 'GET' }, token)

export const seedDemoWarehouse = (token: string) =>
  requestJson<{ seeded_racks: number; total_racks: number }>('/api/v1/warehouse/seed-demo', { method: 'POST' }, token)
export const listCargoTypes = (token: string) => requestJson<CargoTypeItem[]>('/api/v1/warehouse/cargo-types', { method: 'GET' }, token)
export const createCargoType = (token: string, body: Omit<CargoTypeItem, 'id'>) =>
  requestJson<CargoTypeItem>('/api/v1/warehouse/cargo-types', { method: 'POST', body: JSON.stringify(body) }, token)
export const deleteCargoType = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/cargo-types/${id}`, { method: 'DELETE' }, token)

export const listRacks = (token: string) => requestJson<RackLayoutItem[]>('/api/v1/warehouse/racks', { method: 'GET' }, token)
export const createRack = (token: string, body: Omit<RackLayoutItem, 'id' | 'total_slots'>) =>
  requestJson<RackLayoutItem>('/api/v1/warehouse/racks', { method: 'POST', body: JSON.stringify(body) }, token)
export const updateRackPosition = (token: string, id: string, pos_x: number, pos_z: number, rotation_deg: 0 | 90) =>
  requestJson<RackLayoutItem>(`/api/v1/warehouse/racks/${id}`, { method: 'PATCH', body: JSON.stringify({ pos_x, pos_z, rotation_deg }) }, token)
export const updateRackMeta = (token: string, id: string, name: string, max_load_kg: number, cargo_type_code: string | null) =>
  requestJson<RackLayoutItem>(`/api/v1/warehouse/racks/${id}/meta`, { method: 'PATCH', body: JSON.stringify({ name, max_load_kg, cargo_type_code }) }, token)
export const deleteRack = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/racks/${id}`, { method: 'DELETE' }, token)

export const listRoads = (token: string) => requestJson<RoadZoneItem[]>('/api/v1/warehouse/roads', { method: 'GET' }, token)
export const createRoad = (token: string, body: Omit<RoadZoneItem, 'id' | 'is_locked'>) =>
  requestJson<RoadZoneItem>('/api/v1/warehouse/roads', { method: 'POST', body: JSON.stringify(body) }, token)
export const deleteRoad = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/roads/${id}`, { method: 'DELETE' }, token)

export const listSlots = (token: string, rackId?: string) =>
  requestJson<WarehouseSlotItem[]>(rackId ? `/api/v1/warehouse/slots?rack_id=${rackId}` : '/api/v1/warehouse/slots', { method: 'GET' }, token)
export const updateSlot = (token: string, id: string, body: { status: 'available' | 'locked' | 'disabled'; slot_type: SlotType; abc_class: AbcClass; allow_mixed: boolean; max_weight_kg: number; remark: string }) =>
  requestJson<WarehouseSlotItem>(`/api/v1/warehouse/slots/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
export const mergeSlot = (token: string, id: string) =>
  requestJson<{ merged: boolean }>(`/api/v1/warehouse/slots/${id}/merge`, { method: 'POST' }, token)
export const splitSlot = (token: string, id: string) =>
  requestJson<{ split: boolean }>(`/api/v1/warehouse/slots/${id}/split`, { method: 'POST' }, token)
export const batchSlots = (token: string, body: { rack_id: string; bay_idx?: number; level_idx?: number; action: 'lock' | 'unlock' | 'disable' | 'set_abc' | 'set_type'; abc_class?: AbcClass; slot_type?: SlotType }) =>
  requestJson<{ updated: number }>('/api/v1/warehouse/slots/batch', { method: 'POST', body: JSON.stringify(body) }, token)

export const listCampusZones = (token: string) =>
  requestJson<CampusZoneItem[]>('/api/v1/campus/zones', { method: 'GET' }, token)
export const updateCampusZone = (token: string, id: string, body: { name?: string; x?: number; y?: number; w?: number; h?: number; doors?: CampusDoor[] }) =>
  requestJson<CampusZoneItem>(`/api/v1/campus/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
export const resetCampusZones = (token: string, randomize = false) =>
  requestJson<CampusZoneItem[]>('/api/v1/campus/zones/reset', { method: 'POST', body: JSON.stringify({ randomize }) }, token)

export const listCampusRoads = (token: string) =>
  requestJson<CampusRoadItem[]>('/api/v1/campus/roads', { method: 'GET' }, token)
export const createCampusRoad = (token: string, body: Omit<CampusRoadItem, 'id' | 'is_locked'>) =>
  requestJson<CampusRoadItem>('/api/v1/campus/roads', { method: 'POST', body: JSON.stringify(body) }, token)
export const deleteCampusRoad = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/campus/roads/${id}`, { method: 'DELETE' }, token)

export async function rawApiRequest(method: 'GET' | 'POST' | 'DELETE', path: string, token: string, body?: unknown): Promise<RawApiResult> {
  const t0 = performance.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (path !== '/health' && token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(`${API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  const bodyText = await resp.text()
  return { status: resp.status, ok: resp.ok, latencyMs: Math.round(performance.now() - t0), bodyText }
}
