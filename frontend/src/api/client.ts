<<<<<<< HEAD
import type { CargoTypeItem, LayoutRandomizeResult, RackLayoutItem, RoadZoneItem, SlotItem, SlotSyncResult, SlotUpdateBody } from './warehouseTypes'

export type { CargoTypeItem, LayoutRandomizeResult, RackLayoutItem, RoadZoneItem, SlotItem, SlotStats, SlotStatus, SlotSyncResult, SlotUpdateBody } from './warehouseTypes'
=======
import type { CargoTypeItem, RackLayoutItem, RoadZoneItem } from './warehouseTypes'

export type { CargoTypeItem, RackLayoutItem, RoadZoneItem } from './warehouseTypes'
>>>>>>> ini

export interface UserInfo {
  user_id?: string
  id?: string
  username: string
  role: 'admin' | 'user' | 'readonly' | 'external_guest'
  allowed_tools: string[]
  groups: string[]
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

export interface RawApiResult {
  status: number
  ok: boolean
  latencyMs: number
  bodyText: string
}

async function requestJson<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(url, { ...options, headers })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`${resp.status}: ${text || resp.statusText}`)
  }
  return resp.json() as Promise<T>
}

export const devLogin = (username = 'shenyang', role: UserInfo['role'] = 'admin', groups?: string[]) =>
  requestJson<AuthResponse>('/api/v1/auth/dev-login', { method: 'POST', body: JSON.stringify({ username, role, groups }) })

export const registerUser = (username: string, password: string, role: UserInfo['role'], groups: string[]) =>
  requestJson<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ username, password, role, groups }) })

export const loginUser = (username: string, password: string) =>
  requestJson<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const seedDemoWarehouse = (token: string) =>
  requestJson<{ seeded_racks: number; total_racks: number }>('/api/v1/warehouse/seed-demo', { method: 'POST' }, token)

export const listCargoTypes = (token: string) =>
  requestJson<CargoTypeItem[]>('/api/v1/warehouse/cargo-types', { method: 'GET' }, token)

export const createCargoType = (token: string, body: Omit<CargoTypeItem, 'id'>) =>
  requestJson<CargoTypeItem>('/api/v1/warehouse/cargo-types', { method: 'POST', body: JSON.stringify(body) }, token)

export const deleteCargoType = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/cargo-types/${id}`, { method: 'DELETE' }, token)

export const listRacks = (token: string) =>
  requestJson<RackLayoutItem[]>('/api/v1/warehouse/racks', { method: 'GET' }, token)

export const createRack = (token: string, body: Omit<RackLayoutItem, 'id' | 'total_slots'>) =>
  requestJson<RackLayoutItem>('/api/v1/warehouse/racks', { method: 'POST', body: JSON.stringify(body) }, token)

<<<<<<< HEAD
export type RackUpdateBody = Partial<Omit<RackLayoutItem, 'id' | 'code' | 'total_slots'>>

export const updateRack = (token: string, id: string, body: RackUpdateBody) =>
  requestJson<RackLayoutItem>(`/api/v1/warehouse/racks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
=======
export const updateRackPosition = (token: string, id: string, pos_x: number, pos_z: number, rotation_deg: 0 | 90) =>
  requestJson<RackLayoutItem>(`/api/v1/warehouse/racks/${id}`, { method: 'PATCH', body: JSON.stringify({ pos_x, pos_z, rotation_deg }) }, token)
>>>>>>> ini

export const deleteRack = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/racks/${id}`, { method: 'DELETE' }, token)

export const listRoads = (token: string) =>
  requestJson<RoadZoneItem[]>('/api/v1/warehouse/roads', { method: 'GET' }, token)

export const createRoad = (token: string, body: Omit<RoadZoneItem, 'id' | 'is_locked'>) =>
  requestJson<RoadZoneItem>('/api/v1/warehouse/roads', { method: 'POST', body: JSON.stringify(body) }, token)

export const deleteRoad = (token: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/v1/warehouse/roads/${id}`, { method: 'DELETE' }, token)

<<<<<<< HEAD
export const listSlots = (token: string, rackId?: string) =>
  requestJson<SlotItem[]>(`/api/v1/warehouse/slots${rackId ? `?rack_id=${encodeURIComponent(rackId)}` : ''}`, { method: 'GET' }, token)

export const syncRackSlots = (token: string, rackId: string) =>
  requestJson<SlotSyncResult>(`/api/v1/warehouse/racks/${rackId}/slots/sync`, { method: 'POST' }, token)

export const syncAllSlots = (token: string) =>
  requestJson<SlotSyncResult>('/api/v1/warehouse/slots/sync-all', { method: 'POST' }, token)

export const updateSlot = (token: string, id: string, body: SlotUpdateBody) =>
  requestJson<SlotItem>(`/api/v1/warehouse/slots/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)

export const randomizeLayout = (token: string) =>
  requestJson<LayoutRandomizeResult>('/api/v1/warehouse/layout/randomize', { method: 'POST' }, token)

=======
>>>>>>> ini
export async function rawApiRequest(method: 'GET' | 'POST' | 'DELETE', path: string, token: string, body?: unknown): Promise<RawApiResult> {
  const t0 = performance.now()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (path !== '/health' && token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  const bodyText = await resp.text()
  return { status: resp.status, ok: resp.ok, latencyMs: Math.round(performance.now() - t0), bodyText }
}
