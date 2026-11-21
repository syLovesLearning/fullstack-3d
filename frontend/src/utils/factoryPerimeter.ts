import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { buildCornerElectricBox } from './electricBox'
import { buildWarehouseProps } from './warehouseProps'
import { buildCableReels } from './cableReels'

export interface FactoryStats {
  widthM: number
  lengthM: number
  heightM: number
  railHeightM: number
  columnCount: number
  machineCount: number
  onTick: (dt: number) => void
}

function addStaticBox(group: THREE.Group, size: [number, number, number], pos: [number, number, number], mat: THREE.Material, uvScaleX = 1) {
  const g = new THREE.BoxGeometry(...size)
  if (uvScaleX !== 1) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * uvScaleX) }
  g.setAttribute('uv2', g.attributes.uv)
  const m = new THREE.Mesh(g, mat)
  m.position.set(...pos)
  m.matrixAutoUpdate = false
  m.updateMatrix()
  group.add(m)
}

function addInstancedStatic(
  group: THREE.Group,
  size: [number, number, number],
  mat: THREE.Material,
  positions: [number, number, number][],
) {
  if (!positions.length) return
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), mat, positions.length)
  const d = new THREE.Object3D()
  positions.forEach(([x, y, z], i) => {
    d.position.set(x, y, z)
    d.updateMatrix()
    mesh.setMatrixAt(i, d.matrix)
  })
  mesh.matrixAutoUpdate = false
  mesh.updateMatrix()
  group.add(mesh)
}

export function buildFactoryPerimeter(group: THREE.Group, pool: MaterialPool): FactoryStats {
  const W = 90, L = 140, H = 14, RAIL_Y = 10.5, BAY = 10
  const hw = W / 2, hl = L / 2

  const sg = new THREE.PlaneGeometry(W + 6, L + 6); sg.setAttribute('uv2', sg.attributes.uv)
  const slab = new THREE.Mesh(sg, pool.get('concrete_slab'))
  slab.rotation.x = -Math.PI / 2
  slab.receiveShadow = true; slab.matrixAutoUpdate = false; slab.updateMatrix()
  group.add(slab)

  const concMat = pool.get('concrete_plinth')
  const wallMat = pool.get('steel_wall')

  for (const sx of [-1, 1]) {
    const x = sx * hw
    addStaticBox(group, [0.45, 1.8, L], [x, 0.9, 0], concMat)
    addStaticBox(group, [0.22, H - 1.8, L], [x, 1.8 + (H - 1.8) / 2, 0], wallMat)
  }

  for (const sz of [-1, 1]) {
    const z = sz * hl
    for (const segX of [-25.5, 25.5]) {
      addStaticBox(group, [39, 1.8, 0.45], [segX, 0.9, z], concMat, 39 / L)
      addStaticBox(group, [39, H - 1.8, 0.22], [segX, 1.8 + (H - 1.8) / 2, z], wallMat, 39 / L)
    }
    addStaticBox(group, [12, H - 6.5, 0.22], [0, 6.5 + (H - 6.5) / 2, z], wallMat, 12 / L)
  }

  const pierPos: [number, number, number][] = []
  const colPos: [number, number, number][] = []
  const corbelPos: [number, number, number][] = []
  const winPos: [number, number, number][] = []

  for (let z = -hl; z <= hl; z += BAY) {
    for (const sx of [-1, 1]) {
      const x = sx * (hw - 0.35)
      pierPos.push([x, 1.0, z])
      colPos.push([x, H / 2, z])
      corbelPos.push([sx * (hw - 0.85), RAIL_Y - 0.55, z])
      if (z < hl) winPos.push([sx * (hw - 0.12), 7.8, z + BAY / 2])
    }
  }
  for (let x = -hw + 15; x <= hw - 15; x += 15) {
    if (Math.abs(x) < 8) continue
    for (const sz of [-1, 1]) {
      pierPos.push([x, 1.0, sz * (hl - 0.35)])
      colPos.push([x, H / 2, sz * (hl - 0.35)])
    }
  }

  addInstancedStatic(group, [0.95, 2.0, 0.95], concMat, pierPos)
  addInstancedStatic(group, [0.55, H, 0.55], pool.get('steel_column'), colPos)
  addInstancedStatic(group, [0.9, 0.65, 0.5], pool.get('corbel'), corbelPos)
  addInstancedStatic(group, [0.08, 3.6, 2.4], pool.get('daylight_window'), winPos)

  const girderMat = pool.get('crane_girder')
  const railMat = pool.get('crane_rail')
  for (const sx of [-1, 1]) {
    const rx = sx * (hw - 0.95)
    addStaticBox(group, [0.65, 0.85, L - 1], [rx, RAIL_Y - 0.45, 0], girderMat)
    addStaticBox(group, [0.18, 0.22, L - 1], [rx, RAIL_Y + 0.08, 0], railMat)
  }

  buildCornerElectricBox(group, pool)
  const onTick = buildWarehouseProps(group, pool)
  buildCableReels(group, pool)
  return { widthM: W, lengthM: L, heightM: H, railHeightM: RAIL_Y, columnCount: colPos.length, machineCount: 0, onTick }
}
