import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, instancedBoxes, markAnimated } from './equipmentTypes'

/** 移动式剪叉升降平台：底盘 + 剪叉机构 + 护栏平台 + 液压站，平台轻微起伏。 */
export function buildScissorLift(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, EM.graphite, [2.2, 0.26, 3.0], [0, 0.28, 0])
  box(group, EM.hazard, [2.2, 0.06, 0.16], [0, 0.4, 1.45])
  for (const x of [-0.9, 0.9]) for (const z of [-1.15, 1.15]) box(group, EM.rubber, [0.24, 0.24, 0.2], [x, 0.16, z])

  const links: THREE.Mesh[] = []
  for (const x of [-0.82, 0.82]) {
    for (const tilt of [0.52, -0.52]) {
      const link = box(group, EM.orange, [0.08, 1.85, 0.14], [x, 1.08, 0])
      link.rotation.z = tilt
      links.push(link)
      markAnimated(link)
    }
  }
  cyl(group, 0.09, 0.09, 1.1, 10, EM.graphite, [0, 1.05, 0])

  const platform = new THREE.Group()
  platform.position.set(0, 2.02, 0)
  markAnimated(platform)
  group.add(platform)
  box(platform, EM.graphite, [2.15, 0.12, 2.95], [0, 0, 0])
  box(platform, pool.get('stainless_steel'), [2.0, 0.03, 2.8], [0, 0.07, 0])
  for (const x of [-1.02, 1.02]) for (const z of [-1.42, 0, 1.42]) {
    box(platform, EM.orange, [0.06, 1.05, 0.06], [x, 0.53, z])
  }
  for (const y of [0.35, 1.02]) {
    instancedBoxes(platform, EM.orange, [2.1, 0.05, 0.05], [{ pos: [0, y, -1.42] }, { pos: [0, y, 1.42] }])
    instancedBoxes(platform, EM.orange, [0.05, 0.05, 2.9], [{ pos: [-1.02, y, 0] }, { pos: [1.02, y, 0] }])
  }
  box(platform, EM.navy, [0.4, 0.55, 0.3], [-0.72, 0.62, -1.0])
  box(platform, EM.screen, [0.26, 0.2, 0.02], [-0.72, 0.78, -0.84])
  const beacon = EM.ledAmber.clone()
  beacon.userData.own = true
  cyl(platform, 0.05, 0.05, 0.1, 8, beacon, [0.72, 1.1, -1.2])

  let t = 0
  const tick = (dt: number) => {
    t += dt
    platform.position.y = 2.02 + Math.sin(t * 0.55) * 0.07
    links.forEach((l, i) => { l.rotation.z = (i % 2 === 0 ? 0.52 : -0.52) + Math.sin(t * 0.55) * 0.015 })
    beacon.emissiveIntensity = 0.7 + Math.abs(Math.sin(t * 2.6)) * 1.3
  }

  return finalize({ group, width: 2.8, depth: 3.4, tick })
}
