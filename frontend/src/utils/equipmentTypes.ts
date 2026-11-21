import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface EquipmentModel {
  group: THREE.Group
  width: number
  depth: number
  tick?: (dt: number) => void
}

export type Vec3 = [number, number, number]

export function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: Vec3,
  rot: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(...pos)
  mesh.rotation.set(...rot)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function box(parent: THREE.Object3D, mat: THREE.Material, size: Vec3, pos: Vec3, rot: Vec3 = [0, 0, 0]) {
  return addMesh(parent, new THREE.BoxGeometry(...size), mat, pos, rot)
}

export function rbox(parent: THREE.Object3D, mat: THREE.Material, size: Vec3, radius: number, pos: Vec3, rot: Vec3 = [0, 0, 0]) {
  return addMesh(parent, new RoundedBoxGeometry(...size, 2, radius), mat, pos, rot)
}

export function cyl(
  parent: THREE.Object3D, rTop: number, rBottom: number, h: number, seg: number,
  mat: THREE.Material, pos: Vec3, rot: Vec3 = [0, 0, 0],
) {
  return addMesh(parent, new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat, pos, rot)
}

interface Transform { pos: Vec3; rot?: Vec3 }

export function instancedBoxes(parent: THREE.Object3D, mat: THREE.Material, size: Vec3, items: Transform[]) {
  if (!items.length) return
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), mat, items.length)
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.pos)
    d.rotation.set(...(it.rot ?? [0, 0, 0]))
    d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.castShadow = true
  inst.receiveShadow = true
  inst.matrixAutoUpdate = false
  inst.updateMatrix()
  parent.add(inst)
}

export function instancedCylinders(
  parent: THREE.Object3D, r: number, h: number, seg: number, mat: THREE.Material, items: Transform[],
) {
  if (!items.length) return
  const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, h, seg), mat, items.length)
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.pos)
    d.rotation.set(...(it.rot ?? [0, 0, 0]))
    d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.castShadow = true
  inst.receiveShadow = true
  inst.matrixAutoUpdate = false
  inst.updateMatrix()
  parent.add(inst)
}

export function markAnimated(node: THREE.Object3D) {
  node.userData.keepSeparate = true
}

function insideAnimated(node: THREE.Object3D, root: THREE.Object3D) {
  let cur: THREE.Object3D | null = node
  while (cur && cur !== root) {
    if (cur.userData.keepSeparate) return true
    cur = cur.parent
  }
  return false
}

/** 把静态零件按材质合批，显著降低 DrawCalls；动画节点用 markAnimated 保留独立。 */
export function mergeStaticParts(group: THREE.Group) {
  group.updateMatrixWorld(true)
  const rootInv = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const byMaterial = new Map<string, THREE.Mesh[]>()
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return
    if (Array.isArray(o.material) || insideAnimated(o, group)) return
    const list = byMaterial.get(o.material.uuid) ?? []
    list.push(o)
    byMaterial.set(o.material.uuid, list)
  })

  for (const meshes of byMaterial.values()) {
    if (meshes.length < 2) continue
    const geos = meshes.map((m) => {
      const copy = m.geometry.clone()
      const rel = new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld)
      copy.applyMatrix4(rel)
      return copy
    })
    const merged = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!merged) continue
    meshes.forEach((m) => {
      m.parent?.remove(m)
      m.geometry.dispose()
    })
    const mesh = new THREE.Mesh(merged, meshes[0].material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
}

export function finalize(model: EquipmentModel): EquipmentModel {
  mergeStaticParts(model.group)
  model.group.traverse((o) => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true }
  })
  return model
}
