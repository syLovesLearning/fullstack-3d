import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MaterialPool, type PoolKey } from './materialPool'

function addInst(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  positions: [number, number, number][],
) {
  if (!positions.length) return
  const inst = new THREE.InstancedMesh(geo, mat, positions.length)
  const d = new THREE.Object3D()
  positions.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); inst.setMatrixAt(i, d.matrix) })
  inst.castShadow = true; inst.receiveShadow = true; inst.matrixAutoUpdate = false; inst.updateMatrix(); group.add(inst)
}

/** 在通道旁地坪布置：1) 镂空木托盘堆垛  2) 3×2×3 码垛小纸箱  3) 黄黑电动叉车（含巡航动画）。 */
export function buildWarehouseProps(group: THREE.Group, pool: MaterialPool): (dt: number) => void {
  const plankPos: [number, number, number][] = []
  const runnerPos: [number, number, number][] = []
  const miniBoxPos: [number, number, number][] = []

  // 1. 镂空空木托盘堆垛（图1左侧样式：5根顶板 + 3根底梁）
  const emptyStacks: [number, number, number][] = [
    [-7.5, 0, 44], [-7.5, 0, 46.2], [7.5, 0, 44], [7.5, 0, 46.2],
  ]
  emptyStacks.forEach(([sx, _, sz], idx) => {
    const layers = idx % 2 === 0 ? 4 : 3
    for (let l = 0; l < layers; l++) {
      const y = l * 0.14
      for (const rz of [-0.52, 0, 0.52]) runnerPos.push([sx, y + 0.04, sz + rz])
      for (const px of [-0.52, -0.26, 0, 0.26, 0.52]) plankPos.push([sx + px, y + 0.105, sz])
    }
  })

  // 2. 3×2×3 码垛小纸箱（图1右侧样式，共 4 垛）
  const stackCenters: [number, number, number][] = [
    [-7.5, 0, 39], [-7.5, 0, 41.2], [7.5, 0, 39], [7.5, 0, 41.2],
  ]
  for (const [cx, _, cz] of stackCenters) {
    for (const rz of [-0.52, 0, 0.52]) runnerPos.push([cx, 0.04, cz + rz])
    for (const px of [-0.52, -0.26, 0, 0.26, 0.52]) plankPos.push([cx + px, 0.105, cz])
    for (let ix = -1; ix <= 1; ix++) {
      for (let iz = 0; iz < 2; iz++) {
        for (let iy = 0; iy < 3; iy++) {
          miniBoxPos.push([cx + ix * 0.41, 0.14 + 0.18 + iy * 0.36, cz - 0.28 + iz * 0.56])
        }
      }
    }
  }

  addInst(group, new THREE.BoxGeometry(0.16, 0.035, 1.24), pool.get('pallet_wood' as PoolKey), plankPos)
  addInst(group, new THREE.BoxGeometry(1.24, 0.08, 0.12), pool.get('pallet_wood' as PoolKey), runnerPos)
  addInst(group, new THREE.BoxGeometry(0.39, 0.34, 0.54), pool.get('cardboard_box' as PoolKey), miniBoxPos)

  // 3. 构建 3 台黄黑电动平衡重叉车（2 台沿主通道巡航，1 台停靠待命）
  const createForklift = (withCargo: boolean) => {
    const fl = new THREE.Group()
    const yellow = pool.get('agv_yellow'), black = pool.get('black_hardware'), steel = pool.get('stainless_steel')
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.85, 2.05, 2, 0.1), yellow)
    body.position.set(0, 0.68, -0.15); body.castShadow = true; fl.add(body)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.45), black)
    seat.position.set(0, 1.38, -0.35); fl.add(seat)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 1.35), black)
    roof.position.set(0, 2.28, -0.12); fl.add(roof)
    for (const px of [-0.5, 0.5]) {
      for (const pz of [-0.72, 0.45]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), black)
        pillar.position.set(px, 1.68, pz); fl.add(pillar)
      }
    }
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16)
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12)
    for (const wx of [-0.56, 0.56]) {
      for (const wz of [-0.78, 0.58]) {
        const w = new THREE.Mesh(wheelGeo, black); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.28, wz); fl.add(w)
        const h = new THREE.Mesh(hubGeo, steel); h.rotation.z = Math.PI / 2; h.position.set(wx, 0.28, wz); fl.add(h)
      }
    }
    // 门架 + 货叉
    for (const mx of [-0.36, 0.36]) {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.35, 0.12), black)
      mast.position.set(mx, 1.32, 0.96); fl.add(mast)
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 1.15), yellow)
      fork.position.set(mx * 0.7, 0.18, 1.56); fl.add(fork)
    }
    if (withCargo) {
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), pool.get('cardboard_box' as PoolKey))
      cargo.position.set(0, 0.68, 1.62); fl.add(cargo)
    }
    return fl
  }

  const flA = createForklift(true); flA.position.set(-1.8, 0, 10); group.add(flA)
  const flB = createForklift(true); flB.position.set(1.8, 0, -20); flB.rotation.y = Math.PI; group.add(flB)
  const flIdle = createForklift(false); flIdle.position.set(-6.2, 0, 48); flIdle.rotation.y = Math.PI / 3; group.add(flIdle)

  let tAcc = 0
  return (dt: number) => {
    tAcc += dt
    flA.position.z = -38 + ((tAcc * 3.2) % 80)
    flB.position.z = 42 - ((tAcc * 2.8) % 80)
  }
}
