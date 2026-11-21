import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { box, cyl, finalize, markAnimated, rbox } from './equipmentTypes'

export interface DemoForklift {
  group: THREE.Group
  setForkHeight: (y: number) => void
  setCargoVisible: (visible: boolean) => void
  spinWheels: (dt: number, speed: number) => void
}

/** 搬运演示用平衡重叉车：门架、货叉、驾驶室、警示灯，货叉高度与货物可独立控制。 */
export function buildDemoForklift(pool: MaterialPool, cargoColor: string): DemoForklift {
  const group = new THREE.Group()
  const yellow = pool.get('agv_yellow')
  const black = EM.graphite
  const steel = pool.get('stainless_steel')

  rbox(group, yellow, [1.22, 0.82, 2.0], 0.1, [0, 0.72, -0.1])
  rbox(group, EM.navy, [1.24, 0.55, 0.55], 0.06, [0, 0.58, -1.16])
  box(group, black, [1.0, 0.1, 1.55], [0, 1.13, -0.2])
  box(group, black, [0.5, 0.6, 0.42], [0, 1.5, -0.45])
  box(group, black, [1.12, 0.06, 1.35], [0, 2.32, -0.12])
  for (const x of [-0.5, 0.5]) for (const z of [-0.78, 0.42]) box(group, black, [0.06, 1.2, 0.06], [x, 1.72, z])

  const wheelGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.18, 18)
  const wheelMeshes: THREE.Mesh[] = []
  for (const x of [-0.6, 0.6]) for (const z of [-0.78, 0.55]) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0.29, z)
    pivot.rotation.z = Math.PI / 2
    markAnimated(pivot)
    group.add(pivot)
    const wheel = new THREE.Mesh(wheelGeo, EM.rubber)
    wheel.castShadow = true
    pivot.add(wheel)
    wheelMeshes.push(wheel)
    cyl(pivot, 0.13, 0.13, 0.2, 12, steel, [0, 0, 0])
  }

  for (const x of [-0.38, 0.38]) {
    box(group, black, [0.1, 2.45, 0.13], [x, 1.35, 0.93])
    box(group, steel, [0.03, 2.2, 0.03], [x, 1.35, 1.0])
  }
  box(group, black, [0.9, 0.12, 0.14], [0, 2.6, 0.93])

  const carriage = new THREE.Group()
  carriage.position.set(0, 0.18, 0.98)
  markAnimated(carriage)
  group.add(carriage)
  box(carriage, black, [0.86, 0.28, 0.14], [0, 0, 0])
  for (const x of [-0.32, 0.32]) box(carriage, yellow, [0.13, 0.06, 1.25], [x, -0.02, 0.68])

  const cargoMat = new THREE.MeshStandardMaterial({ color: cargoColor || '#d97706', roughness: 0.55, metalness: 0.12 })
  cargoMat.userData.own = true
  const cargo = new THREE.Group()
  cargo.position.set(0, 0.26, 0.62)
  markAnimated(cargo)
  cargo.visible = false
  carriage.add(cargo)
  box(cargo, pool.get('pallet_wood'), [1.15, 0.12, 1.15], [0, 0.06, 0])
  box(cargo, cargoMat, [1.0, 0.88, 1.0], [0, 0.56, 0])

  const beaconMat = EM.ledAmber.clone()
  beaconMat.userData.own = true
  cyl(group, 0.08, 0.08, 0.12, 10, black, [0.45, 2.42, -0.75])
  cyl(group, 0.055, 0.055, 0.1, 10, beaconMat, [0.45, 2.54, -0.75])

  let t = 0
  const model = finalize({ group, width: 1.5, depth: 2.6 }) as { group: THREE.Group }
  return {
    group,
    setForkHeight: (y) => { carriage.position.y = y },
    setCargoVisible: (visible) => { cargo.visible = visible },
    spinWheels: (dt, speed) => {
      t += dt
      for (const w of wheelMeshes) w.rotation.y -= dt * speed * 3.2
      beaconMat.emissiveIntensity = 0.7 + Math.abs(Math.sin(t * 2.2)) * 1.2
    },
  }
}
