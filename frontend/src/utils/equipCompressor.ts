import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, markAnimated, rbox } from './equipmentTypes'

/** 螺杆空压机站：隔音箱体 + 散热百叶 + 压力表 + 管路 + 冷却风扇。 */
export function buildAirCompressor(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, EM.graphite, [2.3, 0.12, 1.9], [0, 0.06, 0])
  box(group, EM.hazard, [2.3, 0.06, 0.12], [0, 0.14, 0.94])
  rbox(group, EM.cream, [2.0, 1.55, 1.6], 0.05, [0, 0.9, 0])
  rbox(group, EM.graphite, [2.06, 0.12, 1.66], 0.03, [0, 1.7, 0])

  for (const y of [0.5, 0.75, 1.0, 1.25]) box(group, EM.vent, [1.2, 0.12, 0.02], [-0.25, y, 0.81])
  box(group, EM.screen, [0.62, 0.36, 0.02], [0.52, 1.22, 0.81])
  for (const x of [0.35, 0.52, 0.69]) cyl(group, 0.035, 0.035, 0.02, 10, EM.ledGreen, [x, 0.98, 0.82], [Math.PI / 2, 0, 0])

  for (const x of [-0.45, 0.45]) cyl(group, 0.08, 0.08, 0.12, 12, EM.graphite, [x, 1.8, 0.3], [0, 0, 0])
  for (const x of [-0.55, 0.55]) cyl(group, 0.06, 0.06, 0.5, 12, pool.get('stainless_steel'), [x, 1.95, 0.35])
  cyl(group, 0.06, 0.06, 1.3, 12, pool.get('stainless_steel'), [0, 2.2, 0.35], [0, 0, Math.PI / 2])
  for (const x of [-0.3, 0.3]) {
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 18, Math.PI / 2), pool.get('stainless_steel'))
    elbow.rotation.set(Math.PI / 2, 0, 0)
    elbow.position.set(x, 2.12, 0.65)
    elbow.castShadow = true
    group.add(elbow)
  }

  for (const x of [-0.55, -0.2]) {
    cyl(group, 0.11, 0.11, 0.04, 16, EM.graphite, [x, 1.45, 0.81], [Math.PI / 2, 0, 0])
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), EM.gauge)
    face.position.set(x, 1.45, 0.835)
    group.add(face)
  }

  const fan = new THREE.Group()
  fan.position.set(-0.95, 0.95, -0.82)
  fan.rotation.y = Math.PI / 2
  markAnimated(fan)
  group.add(fan)
  cyl(fan, 0.26, 0.26, 0.06, 16, EM.graphite, [0, 0, 0], [Math.PI / 2, 0, 0])
  for (let i = 0; i < 4; i++) {
    const blade = box(fan, pool.get('stainless_steel'), [0.5, 0.12, 0.02], [0, 0, 0.04])
    blade.rotation.z = (i * Math.PI) / 2
  }

  let t = 0
  const tick = (dt: number) => {
    t += dt
    fan.rotation.z += dt * 3
    fan.rotation.x = Math.sin(t * 0.2) * 0.02
  }

  return finalize({ group, width: 2.5, depth: 2.4, tick })
}
