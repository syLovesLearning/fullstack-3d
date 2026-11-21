import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, instancedCylinders, markAnimated } from './equipmentTypes'

/** 在线视觉检测线：皮带输送 + 扫描门架 + 工控屏 + 剔除气缸，纸箱循环过检。 */
export function buildInspectionLine(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, EM.graphite, [1.12, 0.14, 4.0], [0, 0.9, 0])
  box(group, pool.get('belt_green'), [1.0, 0.05, 3.9], [0, 0.99, 0])
  for (const x of [-0.6, 0.6]) box(group, pool.get('agv_yellow'), [0.06, 0.08, 4.0], [x, 1.06, 0])
  for (const x of [-0.48, 0.48]) for (const z of [-1.7, 1.7]) box(group, EM.graphite, [0.08, 0.86, 0.08], [x, 0.45, z])
  instancedCylinders(group, 0.055, 1.0, 10, pool.get('stainless_steel'),
    [-1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6].map((z) => ({ pos: [0, 0.94, z] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] })))

  const ledMat = EM.ledGreen.clone()
  ledMat.userData.own = true
  for (const x of [-0.78, 0.78]) box(group, EM.graphite, [0.1, 1.5, 0.1], [x, 0.95, 0])
  box(group, EM.graphite, [1.66, 0.12, 0.14], [0, 1.72, 0])
  box(group, ledMat, [1.4, 0.04, 0.05], [0, 1.65, 0])
  box(group, EM.hazard, [1.66, 0.06, 0.14], [0, 1.78, 0])

  const screen = new THREE.Group()
  screen.position.set(1.25, 0, -1.5)
  screen.rotation.y = -0.35
  group.add(screen)
  cyl(screen, 0.05, 0.05, 1.2, 8, EM.graphite, [0, 0.6, 0])
  box(screen, EM.graphite, [0.75, 0.52, 0.06], [0, 1.32, 0])
  box(screen, EM.screen, [0.64, 0.42, 0.02], [0, 1.32, 0.04])
  box(screen, EM.graphite, [0.4, 0.06, 0.25], [0, 1.02, 0])

  const cargo = box(group, pool.get('cardboard_box'), [0.5, 0.36, 0.46], [0, 1.22, -1.8])
  markAnimated(cargo)
  cyl(group, 0.07, 0.07, 0.45, 10, EM.graphite, [0.75, 0.85, 0.9], [0, 0, Math.PI / 2])
  box(group, EM.ledAmber, [0.05, 0.05, 0.05], [0.95, 0.85, 0.9])

  let t = 0
  const tick = (dt: number) => {
    t += dt
    cargo.position.z = -1.9 + ((t * 0.7) % 3.8)
    const near = Math.abs(cargo.position.z) < 0.5
    ledMat.emissiveIntensity = near ? 3.2 : 0.6 + Math.abs(Math.sin(t * 2.4)) * 1.2
  }

  return finalize({ group, width: 3.1, depth: 5.2, tick })
}
