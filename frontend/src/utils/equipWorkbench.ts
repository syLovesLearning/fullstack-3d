import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, rbox } from './equipmentTypes'

/** 维修工作台：工具柜 + 台钳 + 洞洞板 + 工控屏 + 零件盒。 */
export function buildWorkbench(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, EM.hazard, [2.6, 0.05, 1.15], [0, 0.03, 0])
  rbox(group, pool.get('pallet_wood'), [2.5, 0.1, 1.0], 0.02, [0, 0.9, 0])
  for (const x of [-1.1, 1.1]) for (const z of [-0.4, 0.4]) box(group, EM.graphite, [0.08, 0.86, 0.08], [x, 0.44, z])
  box(group, EM.vent, [2.5, 0.95, 0.05], [0, 1.45, -0.48])
  for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) box(group, pool.get('stainless_steel'), [0.04, 0.3, 0.04], [x, 1.32, -0.42])

  const vice = new THREE.Group()
  vice.position.set(-0.75, 1.02, 0.15)
  group.add(vice)
  box(vice, EM.deepBlue, [0.3, 0.18, 0.22], [0, 0, 0])
  box(vice, EM.graphite, [0.1, 0.2, 0.18], [0.2, 0.02, 0])
  cyl(vice, 0.02, 0.02, 0.55, 8, pool.get('stainless_steel'), [0.02, 0.12, 0.2], [0, 0, Math.PI / 2])

  box(group, EM.navy, [0.4, 0.6, 0.35], [0.15, 0.4, 0])
  box(group, EM.navy, [0.4, 0.6, 0.35], [0.62, 0.4, 0])
  for (const x of [0.15, 0.62]) for (const y of [0.22, 0.42, 0.62]) box(group, pool.get('stainless_steel'), [0.2, 0.02, 0.02], [x, y, 0.18])

  box(group, EM.graphite, [0.06, 0.75, 0.06], [0.95, 1.3, 0.1])
  box(group, EM.graphite, [0.55, 0.36, 0.06], [0.95, 1.68, 0.1])
  box(group, EM.screen, [0.47, 0.29, 0.02], [0.95, 1.68, 0.14])

  for (const x of [-0.55, -0.35, -0.15]) rbox(group, EM.deepBlue, [0.16, 0.14, 0.3], 0.02, [x, 1.02, 0.28])
  box(group, EM.ledGreen, [0.08, 0.04, 0.02], [0.95, 1.98, 0.12])

  return finalize({ group, width: 2.8, depth: 1.4 })
}
