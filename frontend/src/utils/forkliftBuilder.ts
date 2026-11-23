import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MaterialPool, type PoolKey } from './materialPool'

export interface ForkliftHandle {
  group: THREE.Group
  wheels: THREE.Object3D[]
}

interface ForkliftTemplate {
  paintGeo: THREE.BufferGeometry
  ironGeo: THREE.BufferGeometry
  blackGeo: THREE.BufferGeometry
  frontWheelGeo: THREE.BufferGeometry
  rearWheelGeo: THREE.BufferGeometry
  frontHubGeo: THREE.BufferGeometry
  rearHubGeo: THREE.BufferGeometry
  beaconGeo: THREE.BufferGeometry
  palletGeo: THREE.BufferGeometry
  boxGeo: THREE.BufferGeometry
}

function bake(geo: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(1, 1, 1),
  ))
  return g
}

function mergeBaked(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(list, false)
  list.forEach((g) => g.dispose())
  return merged
}

/** 精简且共享 GPU 顶点缓冲的叉车模板：所有叉车复用同一份合并几何体，大幅削减显存与 DrawCalls。 */
export function createForkliftTemplate(): ForkliftTemplate {
  const paintGeo = mergeBaked([
    bake(new RoundedBoxGeometry(1.18, 0.62, 1.56, 2, 0.08), [0, 0.72, 0.05]),
    bake(new RoundedBoxGeometry(1.22, 0.76, 0.66, 2, 0.16), [0, 0.78, -0.92]),
  ])

  const ironParts: THREE.BufferGeometry[] = [
    bake(new THREE.BoxGeometry(1.06, 0.24, 1.96), [0, 0.34, -0.1]),
    bake(new THREE.BoxGeometry(1.14, 0.2, 0.34), [0, 0.42, -1.14]),
    bake(new THREE.BoxGeometry(0.84, 0.12, 0.86), [0, 1.07, -0.35]),
    bake(new THREE.CylinderGeometry(0.035, 0.042, 0.7, 8), [0, 1.24, 0.34], [-0.42, 0, 0]),
    bake(new THREE.BoxGeometry(1.08, 0.05, 1.24), [0, 2.31, -0.14]),
    bake(new THREE.BoxGeometry(0.76, 0.08, 0.09), [0, 1.45, 0.96]),
    bake(new THREE.BoxGeometry(0.76, 0.08, 0.09), [0, 2.42, 0.96]),
    bake(new THREE.CylinderGeometry(0.042, 0.042, 1.75, 8), [0, 1.15, 0.92]),
    bake(new THREE.BoxGeometry(0.94, 0.34, 0.05), [0, 0.78, 1.08]),
  ]
  for (const px of [-0.52, 0.52]) {
    ironParts.push(bake(new THREE.BoxGeometry(0.065, 1.32, 0.065), [px, 1.66, -0.76], [0.06, 0, 0]))
    ironParts.push(bake(new THREE.BoxGeometry(0.065, 1.36, 0.065), [px, 1.66, 0.5], [-0.14, 0, 0]))
  }
  for (const mx of [-0.36, 0.36]) {
    ironParts.push(bake(new THREE.BoxGeometry(0.11, 2.38, 0.13), [mx, 1.35, 0.96]))
    ironParts.push(bake(new THREE.BoxGeometry(0.11, 0.54, 0.055), [mx * 0.72, 0.43, 1.09]))
    ironParts.push(bake(new THREE.BoxGeometry(0.11, 0.048, 1.15), [mx * 0.72, 0.16, 1.63]))
  }
  const ironGeo = mergeBaked(ironParts)

  const blackGeo = mergeBaked([
    bake(new THREE.BoxGeometry(0.46, 0.14, 0.44), [0, 1.2, -0.34]),
    bake(new THREE.BoxGeometry(0.44, 0.46, 0.11), [0, 1.48, -0.53], [-0.12, 0, 0]),
    bake(new THREE.TorusGeometry(0.16, 0.022, 8, 14), [0, 1.54, 0.18], [1.15, 0, 0]),
  ])

  const makeCyl = (r: number, w: number, seg: number) => {
    const g = new THREE.CylinderGeometry(r, r, w, seg)
    g.rotateZ(Math.PI / 2)
    return g
  }

  return {
    paintGeo,
    ironGeo,
    blackGeo,
    frontWheelGeo: makeCyl(0.3, 0.22, 20),
    rearWheelGeo: makeCyl(0.23, 0.17, 18),
    frontHubGeo: makeCyl(0.13, 0.235, 12),
    rearHubGeo: makeCyl(0.1, 0.185, 12),
    beaconGeo: bake(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), [0, 2.4, -0.66]),
    palletGeo: bake(new THREE.BoxGeometry(1.18, 0.12, 1.14), [0, 0.25, 1.65]),
    boxGeo: bake(new THREE.BoxGeometry(1.08, 0.88, 1.06), [0, 0.75, 1.65]),
  }
}

export function instantiateForklift(tpl: ForkliftTemplate, pool: MaterialPool, withCargo: boolean): ForkliftHandle {
  const fl = new THREE.Group()
  const paintMesh = new THREE.Mesh(tpl.paintGeo, pool.get('forklift_paint'))
  paintMesh.castShadow = true; paintMesh.receiveShadow = true; fl.add(paintMesh)

  const ironMesh = new THREE.Mesh(tpl.ironGeo, pool.get('forklift_iron'))
  ironMesh.castShadow = true; ironMesh.receiveShadow = true; fl.add(ironMesh)

  fl.add(new THREE.Mesh(tpl.blackGeo, pool.get('black_hardware')))
  fl.add(new THREE.Mesh(tpl.beaconGeo, pool.get('forklift_beacon')))

  const tireMats = [pool.get('forklift_tire_tread'), pool.get('forklift_tire_side'), pool.get('forklift_tire_side')]
  const hubMat = pool.get('stainless_steel')
  const wheels: THREE.Object3D[] = []

  const addWheel = (geo: THREE.BufferGeometry, hubGeo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const wg = new THREE.Group()
    wg.position.set(x, y, z)
    wg.add(new THREE.Mesh(geo, tireMats))
    wg.add(new THREE.Mesh(hubGeo, hubMat))
    fl.add(wg)
    wheels.push(wg)
  }

  for (const wx of [-0.62, 0.62]) addWheel(tpl.frontWheelGeo, tpl.frontHubGeo, wx, 0.3, 0.58)
  for (const wx of [-0.56, 0.56]) addWheel(tpl.rearWheelGeo, tpl.rearHubGeo, wx, 0.23, -0.82)

  if (withCargo) {
    fl.add(new THREE.Mesh(tpl.palletGeo, pool.get('pallet_wood' as PoolKey)))
    const box = new THREE.Mesh(tpl.boxGeo, pool.get('cardboard_box' as PoolKey))
    box.castShadow = true
    fl.add(box)
  }
  return { group: fl, wheels }
}
