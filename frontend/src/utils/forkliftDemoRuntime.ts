import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { RackLayoutItem } from '../api/warehouseTypes'
import { MaterialPool } from './materialPool'
import { ForkliftDemo, type ForkliftDemoCallbacks } from './forkliftDemo'
import { planForkliftPath } from './forkliftPath'

export interface DemoStartResult { ok: boolean; message?: string; distance?: number }

/** 叉车搬运演示运行时：独立于货架/设备重建，负责路径线、叉车动画与状态回调。 */
export class ForkliftDemoRuntime {
  private group = new THREE.Group()
  private demo: ForkliftDemo | null = null

  constructor(
    private scene: THREE.Scene,
    private pool: MaterialPool,
    private camera: THREE.PerspectiveCamera,
    private ctrl: OrbitControls,
  ) {
    scene.add(this.group)
  }

  start(
    racks: RackLayoutItem[], source: RackLayoutItem, dest: RackLayoutItem,
    cargoColor: string, callbacks: ForkliftDemoCallbacks,
  ): DemoStartResult {
    this.stop()
    const plan = planForkliftPath(racks, source, dest)
    if (!plan || plan.points.length === 0) return { ok: false, message: '未找到可行的叉车路径' }
    const a = plan.points[0]
    const b = plan.points[plan.points.length - 1]
    const midX = (a.x + b.x) / 2
    const midZ = (a.z + b.z) / 2
    const dist = Math.hypot(a.x - b.x, a.z - b.z)
    const back = Math.max(20, 18 + dist * 0.2)
    const camX = Math.max(-40, Math.min(40, midX - 6))
    const camZ = Math.max(-62, Math.min(62, midZ + (midZ >= 0 ? -back : back)))
    this.camera.position.set(camX, Math.min(42, 16 + dist * 0.25), camZ)
    this.ctrl.target.set(midX, 1.2, midZ)
    this.ctrl.update()
    this.demo = new ForkliftDemo(this.group, this.pool, plan, cargoColor, callbacks)
    return { ok: true, distance: plan.length }
  }

  stop() {
    this.demo?.dispose()
    this.demo = null
  }

  update(dt: number) {
    this.demo?.update(dt)
  }

  dispose() {
    this.stop()
    this.scene.remove(this.group)
    this.group.clear()
  }
}
