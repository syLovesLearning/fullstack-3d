import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { EM } from './equipmentMaterials'
import { EquipmentModel, box, cyl, finalize, instancedBoxes, markAnimated, rbox } from './equipmentTypes'

/** 六轴焊接机器人工作站：安全围栏 + 焊接夹具台 + 控制柜，关节持续柔顺摆动。 */
export function buildRobotCell(pool: MaterialPool): EquipmentModel {
  const group = new THREE.Group()
  box(group, EM.graphite, [5.0, 0.04, 5.0], [0, 0.02, 0])
  for (const [w, d, x, z] of [[4.9, 0.16, 0, -2.42], [4.9, 0.16, 0, 2.42], [0.16, 4.9, -2.42, 0], [0.16, 4.9, 2.42, 0]]) {
    box(group, EM.hazard, [w, 0.05, d], [x, 0.05, z])
  }

  const posts = []
  for (const x of [-2.4, 0, 2.4]) for (const z of [-2.4, 2.4]) posts.push({ pos: [x, 0.8, z] as [number, number, number] })
  for (const z of [-2.4, 0, 2.4]) for (const x of [-2.4, 2.4]) posts.push({ pos: [x, 0.8, z] as [number, number, number] })
  instancedBoxes(group, pool.get('agv_yellow'), [0.055, 1.55, 0.055], posts)
  instancedBoxes(group, pool.get('agv_yellow'), [4.85, 0.045, 0.045], [{ pos: [0, 1.5, -2.4] }, { pos: [0, 1.5, 2.4] }, { pos: [0, 0.35, -2.4] }, { pos: [0, 0.35, 2.4] }])
  for (const [size, pos] of [
    [[4.7, 1.1, 0.025], [0, 0.92, -2.4]], [[4.7, 1.1, 0.025], [0, 0.92, 2.4]],
    [[0.025, 1.1, 4.7], [-2.4, 0.92, 0]], [[0.025, 1.1, 4.7], [2.4, 0.92, 0]],
  ] as [[number, number, number], [number, number, number]][]) {
    box(group, EM.glass, size, pos)
  }

  const base = new THREE.Group()
  base.position.set(0, 0.48, 0)
  markAnimated(base)
  group.add(base)
  cyl(base, 0.62, 0.72, 0.32, 24, EM.graphite, [0, 0.16, 0])
  cyl(base, 0.46, 0.5, 0.2, 24, EM.orange, [0, 0.42, 0])
  addMeshTop(base, EM.hazard)

  const shoulder = new THREE.Group()
  shoulder.position.set(0, 0.52, 0)
  base.add(shoulder)
  cyl(shoulder, 0.29, 0.29, 0.58, 18, EM.graphite, [0, 0, 0], [0, 0, Math.PI / 2])
  rbox(shoulder, EM.orange, [0.34, 1.16, 0.4], 0.08, [0, 0.62, 0])

  const elbow = new THREE.Group()
  elbow.position.set(0, 1.2, 0)
  shoulder.add(elbow)
  cyl(elbow, 0.23, 0.23, 0.48, 16, EM.graphite, [0, 0, 0], [0, 0, Math.PI / 2])
  rbox(elbow, EM.orange, [0.27, 0.96, 0.32], 0.06, [0, 0.5, 0])

  const wrist = new THREE.Group()
  wrist.position.set(0, 1.0, 0)
  elbow.add(wrist)
  cyl(wrist, 0.17, 0.17, 0.3, 14, EM.graphite, [0, 0.02, 0])
  rbox(wrist, EM.graphite, [0.24, 0.16, 0.24], 0.03, [0, 0.18, 0])
  for (const x of [-0.11, 0.11]) rbox(wrist, pool.get('stainless_steel'), [0.05, 0.3, 0.13], 0.012, [x, 0.36, 0])
  box(wrist, EM.ledBlue, [0.05, 0.05, 0.05], [0, 0.1, 0.13])

  const table = new THREE.Group()
  table.position.set(1.65, 0, 1.25)
  group.add(table)
  box(table, pool.get('stainless_steel'), [1.35, 0.1, 0.95], [0, 0.86, 0])
  for (const x of [-0.55, 0.55]) for (const z of [-0.36, 0.36]) box(table, EM.graphite, [0.07, 0.84, 0.07], [x, 0.42, z])
  box(table, pool.get('cardboard_box'), [0.72, 0.24, 0.5], [0, 1.03, 0])
  box(table, EM.hazard, [1.35, 0.04, 0.95], [0, 0.8, 0])

  const cabinet = new THREE.Group()
  cabinet.position.set(-1.75, 0, 1.6)
  cabinet.rotation.y = 0.35
  group.add(cabinet)
  rbox(cabinet, EM.navy, [0.92, 1.55, 0.58], 0.03, [0, 0.78, 0])
  box(cabinet, EM.screen, [0.55, 0.34, 0.02], [0, 1.18, 0.3])
  for (const x of [-0.2, 0, 0.2]) cyl(cabinet, 0.045, 0.045, 0.03, 12, EM.ledGreen, [x, 0.88, 0.3], [Math.PI / 2, 0, 0])
  box(cabinet, EM.hazard, [0.92, 0.1, 0.6], [0, 0.05, 0])

  let t = 0
  const tick = (dt: number) => {
    t += dt
    base.rotation.y = Math.sin(t * 0.55) * 0.6
    shoulder.rotation.x = -0.45 + Math.sin(t * 1.15) * 0.36
    elbow.rotation.x = 1.05 + Math.sin(t * 1.15 + 1.1) * 0.45
    wrist.rotation.y = Math.sin(t * 0.9) * 0.75
    wrist.rotation.x = Math.sin(t * 1.3) * 0.18
  }

  return finalize({ group, width: 5.2, depth: 5.2, tick })
}

function addMeshTop(parent: THREE.Object3D, mat: THREE.Material) {
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 24), mat)
  ring.position.y = 0.54
  ring.castShadow = true
  parent.add(ring)
}
