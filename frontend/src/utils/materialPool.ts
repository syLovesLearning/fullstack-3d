import * as THREE from 'three'
import { makeMathConcrete, makeMathWood } from './mathShaders'

export type PoolKey =
  | 'concrete_slab' | 'concrete_plinth' | 'steel_wall' | 'steel_column' | 'corbel'
  | 'crane_girder' | 'crane_rail' | 'daylight_window' | 'safety_green' | 'agv_yellow'
  | 'alert_red' | 'stainless_steel' | 'machine_cream' | 'belt_green' | 'glass_window'
  | 'black_hardware' | 'pallet_wood' | 'cardboard_box' | 'crate_blue' | 'drum_teal'
  | 'rack_upright' | 'rack_beam'
  | 'forklift_paint' | 'forklift_iron' | 'forklift_tire_tread' | 'forklift_tire_side' | 'forklift_beacon'

/** 全局共享材质池：厂房钢柱、牛腿、行车钢梁与货架立柱统一接入 Metal046B 1K PBR 贴图。 */
export class MaterialPool {
  private cache = new Map<PoolKey, THREE.Material>()
  private texs: THREE.Texture[] = []
  private loader = new THREE.TextureLoader()

  private loadTiled(url: string, rx: number, ry: number, srgb = false): THREE.Texture {
    const tex = this.loader.load(url)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(rx, ry)
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace
    this.texs.push(tex)
    return tex
  }

  private makeMetal046B(rx: number, ry: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map: this.loadTiled(`${import.meta.env.BASE_URL}textures/steel_albedo.jpg`, rx, ry, true),
      normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/steel_normal.jpg`, rx, ry),
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/steel_rough.jpg`, rx, ry),
      metalnessMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/steel_metal.jpg`, rx, ry),
      roughness: 1.0, metalness: 0.85, envMapIntensity: 0.45,
    })
  }

  get(key: PoolKey): THREE.Material {
    const hit = this.cache.get(key)
    if (hit) return hit
    const mat = this.create(key)
    this.cache.set(key, mat)
    return mat
  }

  private create(key: PoolKey): THREE.Material {
    switch (key) {
      case 'concrete_slab': return makeMathConcrete(0x565e68, 0.92, true)
      case 'concrete_plinth': return makeMathConcrete(0x88929e, 0.9, false)
      case 'pallet_wood': return makeMathWood(0xd6b588, 0.65)
      case 'steel_wall':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/corr_albedo.jpg`, 6, 1, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/corr_normal.jpg`, 6, 1),
          normalScale: new THREE.Vector2(1.0, 1.0),
          roughnessMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/corr_rough.jpg`, 6, 1),
          aoMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/corr_ao.jpg`, 6, 1),
          aoMapIntensity: 0.75, roughness: 1.0, metalness: 0.18, envMapIntensity: 0.42, side: THREE.DoubleSide,
        })
      case 'steel_column': return this.makeMetal046B(1, 4)
      case 'corbel': return this.makeMetal046B(1, 1)
      case 'crane_girder': return this.makeMetal046B(12, 1)
      case 'rack_upright': return this.makeMetal046B(1, 4)
      case 'crane_rail': return new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.35 })
      case 'daylight_window': return new THREE.MeshStandardMaterial({ color: 0xf0f9ff, emissive: 0xbae6fd, emissiveIntensity: 0.32, roughness: 0.18 })
      case 'safety_green': return makeMathConcrete(0x1b6e3c, 0.78, true, 0.25)
      case 'agv_yellow': return new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.68, metalness: 0.05, envMapIntensity: 0.22 })
      case 'stainless_steel': return new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.38, metalness: 0.65, envMapIntensity: 0.42 })
      case 'machine_cream': return new THREE.MeshStandardMaterial({ color: 0xd6d3c4, roughness: 0.58, metalness: 0.1 })
      case 'glass_window': return new THREE.MeshPhysicalMaterial({ color: 0x0f172a, transparent: true, opacity: 0.42, roughness: 0.15, metalness: 0.12, clearcoat: 0.4 })
      case 'black_hardware':
        return new THREE.MeshStandardMaterial({
          color: 0x1c1e22, normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/plastic_normal.jpg`, 2, 2),
          normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.78, metalness: 0.06, envMapIntensity: 0.18,
        })
      case 'belt_green': return new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.58, metalness: 0.05 })
      case 'crate_blue':
        return new THREE.MeshStandardMaterial({
          color: 0x1d4ed8, normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/plastic_normal.jpg`, 2, 2),
          normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.72, metalness: 0.04, envMapIntensity: 0.22,
        })
      case 'drum_teal': return new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.56, metalness: 0.25, envMapIntensity: 0.28 })
      case 'cardboard_box':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/cardboard_box.jpg`, 1, 1, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/cardboard_normal.jpg`, 4, 4),
          normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.88, metalness: 0.02, envMapIntensity: 0.2,
        })
      case 'alert_red': return new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.35, roughness: 0.48 })
      case 'rack_beam':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/rack_beam_albedo.jpg`, 3, 1, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/rack_beam_normal.jpg`, 3, 1),
          normalScale: new THREE.Vector2(0.85, 0.85), roughness: 0.68, metalness: 0.1, envMapIntensity: 0.22,
        })
      case 'forklift_paint':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_paint_albedo.jpg`, 1.5, 1.5, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_paint_normal.jpg`, 1.5, 1.5),
          normalScale: new THREE.Vector2(0.12, 0.12), roughness: 0.68, metalness: 0.04, envMapIntensity: 0.22,
        })
      case 'forklift_iron':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_iron_albedo.jpg`, 2, 2, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_iron_normal.jpg`, 2, 2),
          normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.78, metalness: 0.22, envMapIntensity: 0.22,
        })
      case 'forklift_tire_tread':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_tire_tread_albedo.jpg`, 3, 1, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_tire_tread_normal.jpg`, 3, 1),
          normalScale: new THREE.Vector2(1.35, 1.35), roughness: 0.9, metalness: 0.0, envMapIntensity: 0.16,
        })
      case 'forklift_tire_side':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_tire_side_albedo.jpg`, 1, 1, true),
          normalMap: this.loadTiled(`${import.meta.env.BASE_URL}textures/forklift_tire_side_normal.jpg`, 1, 1),
          normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.88, metalness: 0.0, envMapIntensity: 0.16,
        })
      case 'forklift_beacon':
        return new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8, roughness: 0.3 })
    }
  }

  get size(): number { return this.cache.size }
  disposeAll() { this.cache.forEach((m) => m.dispose()); this.cache.clear(); this.texs.forEach((t) => t.dispose()); this.texs = [] }
}
