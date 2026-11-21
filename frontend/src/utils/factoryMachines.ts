import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MaterialPool, type PoolKey } from './materialPool'

interface PartSpec {
  geo: THREE.BufferGeometry
  matKey: PoolKey
  localPos: [number, number, number]
  localRot?: [number, number, number]
}

function addInstanced(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  transforms: { pos: [number, number, number]; rot?: [number, number, number] }[],
) {
  if (!transforms.length) return
  const inst = new THREE.InstancedMesh(geo, mat, transforms.length)
  const d = new THREE.Object3D()
  transforms.forEach((t, i) => {
    d.position.set(...t.pos)
    d.rotation.set(...(t.rot ?? [0, 0, 0]))
    d.updateMatrix()
    inst.setMatrixAt(i, d.matrix)
  })
  inst.matrixAutoUpdate = false
  inst.updateMatrix()
  group.add(inst)
}

/** 两条贯通 100m 的长条产线（每条含 4 台倒角主机 + 透明视窗 + 90° 弯道支线 + 圆盘地脚）。 */
export function buildFactoryMachines(group: THREE.Group, pool: MaterialPool): number {
  const lineXs = [-22, 22]
  const stationZs = [-36, -12, 12, 36]
  const LINE_LEN = 100

  // 1. 两条 100m 贯通主输送线（不锈钢导轨 + 绿色皮带 + 黄色护边）
  for (const lx of lineXs) {
    for (const [size, pos, key] of [
      [[1.05, 0.16, LINE_LEN], [lx, 0.92, 0], 'stainless_steel'],
      [[0.82, 0.04, LINE_LEN - 0.2], [lx, 1.02, 0], 'belt_green'],
      [[0.06, 0.12, LINE_LEN], [lx - 0.55, 1.04, 0], 'agv_yellow'],
      [[0.06, 0.12, LINE_LEN], [lx + 0.55, 1.04, 0], 'agv_yellow'],
    ] as [[number, number, number], [number, number, number], PoolKey][]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), pool.get(key))
      m.position.set(...pos); m.matrixAutoUpdate = false; m.updateMatrix(); group.add(m)
    }
  }

  // 2. 沿 100m 输送线每 6m 一组支腿 + 圆形地脚垫片（InstancedMesh 合批）
  const legPos: { pos: [number, number, number] }[] = []
  const footPos: { pos: [number, number, number] }[] = []
  for (const lx of lineXs) {
    for (let z = -48; z <= 48; z += 6) {
      for (const sx of [-0.42, 0.42]) {
        legPos.push({ pos: [lx + sx, 0.45, z] })
        footPos.push({ pos: [lx + sx, 0.015, z] })
      }
    }
  }
  addInstanced(group, new THREE.BoxGeometry(0.1, 0.9, 0.1), pool.get('stainless_steel'), legPos)
  addInstanced(group, new THREE.CylinderGeometry(0.11, 0.13, 0.03, 12), pool.get('black_hardware'), footPos)

  // 3. 8 台在线工位主机（RoundedBox 微倒角 + 透明观察窗 + 内部滚筒 + 门把手 + 90° 弯道上料线）
  const stations: [number, number, number][] = []
  for (const lx of lineXs) for (const sz of stationZs) stations.push([lx, 0, sz])

  const bendGeo = new THREE.TorusGeometry(1.8, 0.36, 8, 16, Math.PI / 2)
  const parts: PartSpec[] = [
    { geo: new RoundedBoxGeometry(3.0, 2.55, 3.4, 3, 0.07), matKey: 'stainless_steel', localPos: [0, 1.275, 0] },
    { geo: new THREE.CylinderGeometry(0.68, 0.28, 0.48, 4), matKey: 'stainless_steel', localPos: [0, 2.79, 0], localRot: [0, Math.PI / 4, 0] },
    { geo: new RoundedBoxGeometry(0.08, 1.45, 2.4, 2, 0.02), matKey: 'machine_cream', localPos: [1.52, 1.62, 0] },
    { geo: new THREE.BoxGeometry(0.06, 0.36, 0.06), matKey: 'black_hardware', localPos: [1.58, 1.6, 0.85] },
    { geo: new THREE.BoxGeometry(0.04, 1.05, 1.45), matKey: 'glass_window', localPos: [1.55, 1.72, -0.35] },
    { geo: new THREE.CylinderGeometry(0.26, 0.26, 1.1, 14), matKey: 'black_hardware', localPos: [0.95, 1.55, -0.35], localRot: [Math.PI / 2, 0, 0] },
    { geo: new THREE.BoxGeometry(0.08, 0.55, 0.68), matKey: 'black_hardware', localPos: [1.65, 1.7, 1.15] },
    { geo: new THREE.BoxGeometry(0.03, 0.42, 0.54), matKey: 'daylight_window', localPos: [1.7, 1.7, 1.15] },
    { geo: bendGeo, matKey: 'belt_green', localPos: [-2.35, 0.98, -1.8], localRot: [Math.PI / 2, 0, 0] },
    { geo: new THREE.BoxGeometry(3.2, 0.14, 0.72), matKey: 'stainless_steel', localPos: [-3.95, 0.92, -1.8] },
  ]

  for (const part of parts) {
    addInstanced(
      group,
      part.geo,
      pool.get(part.matKey),
      stations.map(([sx, sy, sz]) => ({
        pos: [sx + part.localPos[0], sy + part.localPos[1], sz + part.localPos[2]],
        rot: part.localRot,
      })),
    )
  }

  return lineXs.length
}
