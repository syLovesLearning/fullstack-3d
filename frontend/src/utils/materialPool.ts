import * as THREE from 'three'
import { makeMathConcrete, makeMathWood } from './mathShaders'

export type PoolKey =
  | 'concrete_slab'
  | 'concrete_plinth'
  | 'steel_wall'
  | 'steel_column'
  | 'corbel'
  | 'crane_girder'
  | 'crane_rail'
  | 'daylight_window'
  | 'safety_green'
  | 'agv_yellow'
  | 'alert_red'
  | 'stainless_steel'
  | 'machine_cream'
  | 'belt_green'
  | 'glass_window'
  | 'black_hardware'
  | 'pallet_wood'
  | 'cardboard_box'
  | 'crate_blue'
  | 'drum_teal'

/** 全局共享材质池：统一复用数学程序化材质与 PBR 贴图材质。 */
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

  get(key: PoolKey): THREE.Material {
    const hit = this.cache.get(key)
    if (hit) return hit
    const mat = this.create(key)
    this.cache.set(key, mat)
    return mat
  }

  private create(key: PoolKey): THREE.Material {
    switch (key) {
      case 'concrete_slab':
        return makeMathConcrete(0x565e68, 0.92, true)
      case 'concrete_plinth':
        return makeMathConcrete(0x88929e, 0.9, false)
      case 'pallet_wood':
        return makeMathWood(0xd6b588, 0.62)
      case 'steel_wall':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled('/textures/corr_albedo.jpg', 6, 1, true),
          normalMap: this.loadTiled('/textures/corr_normal.jpg', 6, 1),
          normalScale: new THREE.Vector2(1.1, 1.1),
          roughnessMap: this.loadTiled('/textures/corr_rough.jpg', 6, 1),
          aoMap: this.loadTiled('/textures/corr_ao.jpg', 6, 1),
          aoMapIntensity: 0.75, roughness: 1.0, metalness: 0.25, envMapIntensity: 0.55, side: THREE.DoubleSide,
        })
      case 'steel_column':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled('/textures/steel_albedo.jpg', 1, 4, true),
          normalMap: this.loadTiled('/textures/steel_normal.jpg', 1, 4),
          normalScale: new THREE.Vector2(0.8, 0.8),
          roughnessMap: this.loadTiled('/textures/steel_rough.jpg', 1, 4),
          roughness: 1.0, metalness: 0.65,
        })
      case 'corbel':
        return new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.48, metalness: 0.58 })
      case 'crane_girder':
        return new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.55 })
      case 'crane_rail':
        return new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.68 })
      case 'daylight_window':
        return new THREE.MeshStandardMaterial({ color: 0xf0f9ff, emissive: 0xbae6fd, emissiveIntensity: 0.32, roughness: 0.18 })
      case 'safety_green':
        return makeMathConcrete(0x1b6e3c, 0.74, true, 0.32)
      case 'agv_yellow':
        return new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.38, metalness: 0.35 })
      case 'stainless_steel':
        return new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.78 })
      case 'machine_cream':
        return new THREE.MeshStandardMaterial({ color: 0xd6d3c4, roughness: 0.55, metalness: 0.12 })
      case 'glass_window':
        return new THREE.MeshPhysicalMaterial({ color: 0x0f172a, transparent: true, opacity: 0.42, roughness: 0.1, metalness: 0.15, clearcoat: 0.8 })
      case 'black_hardware':
        return new THREE.MeshStandardMaterial({
          color: 0x18181b, normalMap: this.loadTiled('/textures/plastic_normal.jpg', 2, 2),
          normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.62, metalness: 0.18,
        })
      case 'belt_green':
        return new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5, metalness: 0.05 })
      case 'crate_blue':
        return new THREE.MeshStandardMaterial({
          color: 0x1d4ed8, normalMap: this.loadTiled('/textures/plastic_normal.jpg', 2, 2),
          normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: this.loadTiled('/textures/plastic_rough.jpg', 2, 2), roughness: 1.0, metalness: 0.08,
        })
      case 'drum_teal':
        return new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.35, metalness: 0.55 })
      case 'cardboard_box':
        return new THREE.MeshStandardMaterial({
          map: this.loadTiled('/textures/cardboard_box.jpg', 1, 1, true),
          normalMap: this.loadTiled('/textures/cardboard_normal.jpg', 4, 4),
          normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.86, metalness: 0.02, envMapIntensity: 0.25,
        })
      case 'alert_red':
        return new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.35, roughness: 0.45 })
    }
  }

  get size(): number { return this.cache.size }
  disposeAll() { this.cache.forEach((m) => m.dispose()); this.cache.clear(); this.texs.forEach((t) => t.dispose()); this.texs = [] }
}
