import * as THREE from 'three'
import type { RackLayoutItem } from '../api/warehouseTypes'

/** 货架旋转后的世界 AABB 半尺寸（X, Y, Z），米制 */
export function rackWorldHalfExtents(rk: RackLayoutItem): [number, number, number] {
  return rk.rotation_deg === 90
    ? [rk.length_m / 2, rk.height_m / 2, rk.width_m / 2]
    : [rk.width_m / 2, rk.height_m / 2, rk.length_m / 2]
}

/** 创建选中高亮组：半透明琥珀色包围盒 + 描边线框（默认隐藏） */
export function createRackHighlight(): THREE.Group {
  const g = new THREE.Group()
  g.visible = false
  g.renderOrder = 5
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.16, depthWrite: false }),
  )
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xd97706 }),
  )
  g.add(box, edges)
  return g
}

/** 将高亮组套在指定货架上；传 null 隐藏 */
export function applyRackHighlight(g: THREE.Group, rk: RackLayoutItem | null) {
  if (!g) return
  if (!rk) { g.visible = false; return }
  const [hx, hy, hz] = rackWorldHalfExtents(rk)
  g.visible = true
  g.position.set(rk.pos_x, rk.height_m / 2, rk.pos_z)
  g.scale.set(hx * 2, hy * 2, hz * 2)
}

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

/**
 * 指针事件命中货架：对动态层做射线检测，
 * 借助 InstancedMesh.userData.rackIndexByInstance 反查货架对象。
 */
export function pickRackAtPointer(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
  event: { clientX: number; clientY: number },
  layer: THREE.Group,
): RackLayoutItem | null {
  const rect = dom.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  ndc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  raycaster.setFromCamera(ndc, camera)
  const racks = layer.userData.racks as RackLayoutItem[] | undefined
  if (!racks?.length) return null
  const hits = raycaster.intersectObjects(layer.children, true)
  for (const h of hits) {
    const indexByInstance = h.object.userData.rackIndexByInstance as number[] | undefined
    if (!indexByInstance || h.instanceId == null) continue
    const rk = racks[indexByInstance[h.instanceId]]
    if (rk) return rk
  }
  return null
}
