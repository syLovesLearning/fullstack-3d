import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, markAnimated, rbox } from './equipmentTypes'

/** 立式加工中心：钣金外壳 + 观察窗 + 主轴 + 操作面板 + 三色状态灯。 */
export function buildCncCenter(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, pool.get('concrete_plinth'), [3.1, 0.18, 3.5], [0, 0.09, 0])
  rbox(group, EM.cream, [2.7, 2.35, 2.95], 0.06, [0, 1.35, 0])
  rbox(group, EM.graphite, [2.76, 0.22, 3.0], 0.03, [0, 2.55, 0])
  box(group, EM.glass, [1.6, 1.35, 0.03], [0, 1.55, 1.49])
  box(group, EM.graphite, [1.74, 1.49, 0.05], [0, 1.55, 1.46])
  box(group, EM.graphite, [0.9, 1.1, 1.6], [0, 1.35, 0.5])
  box(group, EM.hazard, [2.7, 0.12, 0.04], [0, 0.36, 1.5])

  const spindleMat = EM.graphite
  const spindle = cyl(group, 0.14, 0.18, 0.62, 16, spindleMat, [0, 1.78, 0.72])
  markAnimated(spindle)
  box(group, pool.get('stainless_steel'), [0.4, 0.18, 0.4], [0, 0.92, 0.72])
  box(group, pool.get('cardboard_box'), [0.3, 0.16, 0.3], [0, 1.03, 0.72])

  box(group, EM.graphite, [0.82, 0.92, 0.16], [1.48, 1.32, 0.45])
  box(group, EM.screen, [0.62, 0.4, 0.02], [1.48, 1.5, 0.54])
  for (const z of [-0.2, 0.02, 0.24]) cyl(group, 0.045, 0.045, 0.02, 12, EM.ledGreen, [1.48, 1.12, z + 0.5], [Math.PI / 2, 0, 0])
  box(group, EM.hazard, [0.82, 0.08, 0.17], [1.48, 0.88, 0.45])

  const statusMat = EM.ledGreen.clone()
  statusMat.userData.own = true
  cyl(group, 0.06, 0.06, 0.28, 10, EM.graphite, [-1.05, 2.84, -0.8])
  cyl(group, 0.055, 0.055, 0.09, 10, statusMat, [-1.05, 3.02, -0.8])
  cyl(group, 0.055, 0.055, 0.09, 10, EM.ledAmber, [-1.05, 2.91, -0.8])

  box(group, EM.graphite, [1.5, 0.22, 0.5], [0, 0.42, 1.72])
  box(group, pool.get('belt_green'), [1.32, 0.04, 0.36], [0, 0.55, 1.72])

  let t = 0
  const tick = (dt: number) => {
    t += dt
    spindle.rotation.y += dt * 8
    statusMat.emissiveIntensity = 1.1 + Math.sin(t * 4) * 0.8
  }

  return finalize({ group, width: 3.4, depth: 3.8, tick })
}
