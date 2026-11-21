import * as THREE from 'three'
import { MaterialPool, type PoolKey } from './materialPool'

function addInstanced(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: { pos: [number, number, number]; scale?: [number, number, number]; rotY?: number }[],
) {
  if (!items.length) return
  const inst = new THREE.InstancedMesh(geo, mat, items.length)
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.pos)
    d.rotation.set(0, it.rotY ?? 0, 0)
    d.scale.set(...(it.scale ?? [1, 1, 1]))
    d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.castShadow = true; inst.receiveShadow = true; inst.matrixAutoUpdate = false
  inst.updateMatrix()
  group.add(inst)
}

/** 仓储货架：3 种不同高低大小的货品（牛皮纸箱、堆叠蓝周转箱、金属化工圆桶）全部 InstancedMesh 合批。 */
export function buildWarehouseRacks(group: THREE.Group, pool: MaterialPool): number {
  const rackXs = [-34, -26, -18, -10, 10, 18, 26, 34]
  const BAY_W = 4.0, RACK_D = 1.6, RACK_H = 6.8, BAYS = 18
  const startZ = -(BAYS * BAY_W) / 2
  const levelYs = [0.25, 2.05, 3.85, 5.65]

  const uprights: { pos: [number, number, number] }[] = []
  const endBraces: { pos: [number, number, number] }[] = []
  const beams: { pos: [number, number, number] }[] = []
  const pallets: { pos: [number, number, number] }[] = []
  const boxes: { pos: [number, number, number]; scale: [number, number, number] }[] = []
  const crates: { pos: [number, number, number]; scale: [number, number, number] }[] = []
  const drums: { pos: [number, number, number]; scale: [number, number, number] }[] = []

  const rand = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  rackXs.forEach((rx, rIdx) => {
    for (let b = 0; b <= BAYS; b++) {
      const z = startZ + b * BAY_W
      for (const sx of [-RACK_D / 2, RACK_D / 2]) uprights.push({ pos: [rx + sx, RACK_H / 2, z] })
      if (b === 0 || b === BAYS || b % 3 === 0) {
        for (const ly of [1.1, 2.9, 4.7, 6.4]) endBraces.push({ pos: [rx, ly, z] })
      }
      if (b < BAYS) {
        const cz = z + BAY_W / 2
        levelYs.forEach((ly, lIdx) => {
          for (const sx of [-RACK_D / 2, RACK_D / 2]) beams.push({ pos: [rx + sx, ly, cz] })
          for (const pOff of [-1.0, 1.0]) {
            const seed = rIdx * 1000 + b * 31 + lIdx * 7 + (pOff > 0 ? 1 : 2)
            const rVal = rand(seed)
            if (rVal < 0.14) continue
            const pz = cz + pOff
            pallets.push({ pos: [rx, ly + 0.14, pz] })

            if (rVal < 0.56) {
              // 类型 1：大小高低不一的牛皮纸箱
              const hScale = 0.55 + rand(seed + 9) * 0.65
              const wScale = 0.72 + rand(seed + 13) * 0.28
              boxes.push({ pos: [rx, ly + 0.21 + 0.55 * hScale, pz], scale: [wScale, hScale, wScale] })
            } else if (rVal < 0.80) {
              // 类型 2：低矮蓝色周转料箱（2×2 或双层堆叠）
              const rows = rand(seed + 5) > 0.45 ? 2 : 1
              for (let row = 0; row < rows; row++) {
                for (const dx of [-0.34, 0.34]) {
                  for (const dz of [-0.36, 0.36]) {
                    crates.push({ pos: [rx + dx, ly + 0.21 + 0.22 + row * 0.44, pz + dz], scale: [1, 1, 1] })
                  }
                }
              }
            } else {
              // 类型 3：圆柱金属圆桶（每托盘 4 只，不同高度）
              const dh = 0.82 + rand(seed + 17) * 0.35
              for (const dx of [-0.34, 0.34]) {
                for (const dz of [-0.36, 0.36]) {
                  drums.push({ pos: [rx + dx, ly + 0.21 + 0.46 * dh, pz + dz], scale: [1, dh, 1] })
                }
              }
            }
          }
        })
      }
    }
  })

  addInstanced(group, new THREE.BoxGeometry(0.12, RACK_H, 0.12), pool.get('steel_column'), uprights)
  addInstanced(group, new THREE.BoxGeometry(RACK_D, 0.08, 0.08), pool.get('concrete_plinth'), endBraces)
  addInstanced(group, new THREE.BoxGeometry(0.09, 0.14, BAY_W), pool.get('crane_rail'), beams)
  addInstanced(group, new THREE.BoxGeometry(1.4, 0.14, 1.5), pool.get('pallet_wood' as PoolKey), pallets)
  addInstanced(group, new THREE.BoxGeometry(1.32, 1.1, 1.42), pool.get('cardboard_box' as PoolKey), boxes)
  addInstanced(group, new THREE.BoxGeometry(0.58, 0.42, 0.64), pool.get('crate_blue' as PoolKey), crates)
  addInstanced(group, new THREE.CylinderGeometry(0.28, 0.28, 0.92, 12), pool.get('drum_teal' as PoolKey), drums)

  return rackXs.length * BAYS
}
