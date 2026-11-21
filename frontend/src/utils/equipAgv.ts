import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, instancedCylinders, markAnimated, rbox } from './equipmentTypes'

/** 潜伏式 AGV 搬运车：蓝色机身 + 顶部滚筒线 + 四轮 + 琥珀色警示灯。 */
export function buildAgv(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  rbox(group, EM.deepBlue, [1.5, 0.36, 2.4], 0.12, [0, 0.46, 0])
  rbox(group, EM.navy, [1.4, 0.14, 2.28], 0.05, [0, 0.68, 0])
  box(group, EM.graphite, [1.4, 0.05, 2.12], [0, 0.76, 0])

  instancedCylinders(group, 0.075, 1.28, 12, pool.get('stainless_steel'),
    [-0.78, -0.39, 0, 0.39, 0.78].map((z) => ({ pos: [0, 0.8, z] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] })))

  for (const x of [-0.66, 0.66]) for (const z of [-0.86, 0.86]) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0.25, z)
    pivot.rotation.z = Math.PI / 2
    markAnimated(pivot)
    group.add(pivot)
    cyl(pivot, 0.22, 0.22, 0.14, 16, EM.rubber, [0, 0, 0])
    cyl(pivot, 0.09, 0.09, 0.15, 10, pool.get('stainless_steel'), [0, 0, 0])
  }

  box(group, pool.get('agv_yellow'), [1.46, 0.09, 0.12], [0, 0.3, -1.24])
  box(group, pool.get('agv_yellow'), [1.46, 0.09, 0.12], [0, 0.3, 1.24])
  for (const x of [-0.76, 0.76]) box(group, EM.ledBlue, [0.03, 0.06, 1.9], [x, 0.52, 0])

  const beaconMat = EM.ledAmber.clone()
  beaconMat.userData.own = true
  cyl(group, 0.09, 0.09, 0.16, 12, EM.graphite, [0, 0.86, -0.94])
  cyl(group, 0.06, 0.06, 0.1, 10, beaconMat, [0, 0.99, -0.94])

  box(group, EM.screen, [0.52, 0.28, 0.02], [0, 0.58, 1.2])
  for (const x of [-0.34, 0.34]) box(group, EM.ledGreen, [0.06, 0.05, 0.02], [x, 0.72, 1.2])
  box(group, EM.graphite, [0.7, 0.1, 0.02], [0, 0.35, 1.22])

  const wheels: THREE.Group[] = []
  group.traverse((o) => { if (o instanceof THREE.Group && o.rotation.z === Math.PI / 2) wheels.push(o) })

  let t = 0
  const tick = (dt: number) => {
    t += dt
    beaconMat.emissiveIntensity = 0.55 + Math.abs(Math.sin(t * 3.2)) * 1.9
    wheels.forEach((w) => { w.children[0].rotation.y += dt * 5.5 })
  }

  return finalize({ group, width: 1.8, depth: 2.7, tick })
}
