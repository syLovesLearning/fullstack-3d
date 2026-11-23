import * as THREE from 'three'
import { createForkliftTemplate, instantiateForklift } from './forkliftBuilder'
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
  inst.receiveShadow = true; inst.matrixAutoUpdate = false; inst.updateMatrix(); group.add(inst)
}

/** 在通道旁地坪布置：1) 镂空木托盘堆垛  2) 3×2×3 码垛小纸箱  3) 共享模板高精度叉车。 */
export function buildWarehouseProps(group: THREE.Group, pool: MaterialPool): (dt: number) => void {
  const plankPos: [number, number, number][] = []
  const runnerPos: [number, number, number][] = []
  const miniBoxPos: [number, number, number][] = []

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

  const tpl = createForkliftTemplate()
  const flA = instantiateForklift(tpl, pool, true)
  flA.group.position.set(-1.8, 0, 10)
  group.add(flA.group)

  const flB = instantiateForklift(tpl, pool, true)
  flB.group.position.set(1.8, 0, -20)
  flB.group.rotation.y = Math.PI
  group.add(flB.group)

  const flIdle = instantiateForklift(tpl, pool, false)
  flIdle.group.position.set(-6.2, 0, 48)
  flIdle.group.rotation.y = Math.PI / 3
  group.add(flIdle.group)

  let tAcc = 0
  return (dt: number) => {
    tAcc += dt
    flA.group.position.z = -38 + ((tAcc * 3.2) % 80)
    flB.group.position.z = 42 - ((tAcc * 2.8) % 80)
    for (const w of flA.wheels) w.rotation.x += dt * 10.6
    for (const w of flB.wheels) w.rotation.x += dt * 9.3
  }
}
