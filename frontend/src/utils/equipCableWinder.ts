import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, markAnimated, rbox } from './equipmentTypes'

/** 电缆收放线机：双立柱 + 大电缆盘 + 排线导轨 + 驱动电机与操作柜。 */
export function buildCableWinder(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, pool.get('steel_column'), [4.6, 0.18, 2.4], [0, 0.09, 0])
  box(group, EM.hazard, [4.6, 0.06, 0.14], [0, 0.2, 1.18])

  for (const x of [-1.55, 1.55]) {
    rbox(group, EM.deepBlue, [0.3, 1.5, 0.6], 0.04, [x, 0.93, 0])
    cyl(group, 0.12, 0.12, 0.18, 12, pool.get('stainless_steel'), [x, 1.38, 0], [0, 0, Math.PI / 2])
  }

  const drum = new THREE.Group()
  drum.position.set(0, 1.36, 0)
  markAnimated(drum)
  group.add(drum)
  for (const x of [-0.56, 0.56]) {
    cyl(drum, 0.88, 0.88, 0.09, 28, pool.get('pallet_wood'), [x, 0, 0], [0, 0, Math.PI / 2])
    cyl(drum, 0.5, 0.5, 0.12, 20, EM.graphite, [x, 0, 0], [0, 0, Math.PI / 2])
  }
  cyl(drum, 0.7, 0.7, 1.02, 28, EM.copper, [0, 0, 0], [0, 0, Math.PI / 2])
  cyl(drum, 0.2, 0.2, 1.36, 16, EM.graphite, [0, 0, 0], [0, 0, Math.PI / 2])
  for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.715, 0.018, 8, 32), pool.get('crane_rail'))
    ring.rotation.y = Math.PI / 2
    ring.position.x = x
    ring.castShadow = true
    drum.add(ring)
  }

  box(group, pool.get('stainless_steel'), [2.3, 0.07, 0.09], [0, 2.4, 1.0])
  const carriage = new THREE.Group()
  carriage.position.set(0, 2.28, 1.0)
  markAnimated(carriage)
  group.add(carriage)
  box(carriage, EM.graphite, [0.2, 0.24, 0.14], [0, 0, 0])
  box(carriage, pool.get('agv_yellow'), [0.05, 0.28, 0.2], [0, -0.04, 0.08])

  rbox(group, EM.navy, [0.85, 0.95, 0.75], 0.04, [1.8, 0.6, 0])
  for (const y of [0.3, 0.45, 0.6, 0.75]) box(group, EM.vent, [0.86, 0.03, 0.76], [1.8, y, 0])
  box(group, EM.screen, [0.5, 0.3, 0.02], [1.8, 0.92, 0.39])

  rbox(group, EM.navy, [0.72, 1.25, 0.5], 0.03, [-1.95, 0.75, 0.8])
  box(group, EM.screen, [0.46, 0.28, 0.02], [-1.95, 1.05, 1.06])
  for (const y of [0.86, 0.52]) box(group, EM.ledGreen, [0.06, 0.05, 0.02], [-1.95, y, 1.06])

  for (const x of [-1.9, 1.9]) box(group, EM.glass, [0.03, 1.25, 1.9], [x, 0.85, 0.1])

  let t = 0
  const tick = (dt: number) => {
    t += dt
    drum.rotation.x += dt * 1.25
    carriage.position.x = Math.sin(t * 0.7) * 0.85
  }

  return finalize({ group, width: 4.8, depth: 2.8, tick })
}
