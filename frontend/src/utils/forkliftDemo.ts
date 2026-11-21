import * as THREE from 'three'
import { MaterialPool } from './materialPool'
import { buildDemoForklift, type DemoForklift } from './demoForklift'
import type { ForkliftPathPlan, PathPoint } from './forkliftPath'

export interface ForkliftDemoCallbacks {
  onPickup?: () => void
  onDrop?: () => void
  onStatus?: (status: string) => void
  onDone?: () => void
}

type Phase = 'lift' | 'drive' | 'lower' | 'done'

/** 搬运演示状态机：原地提升 -> 沿 A* 路径行驶 -> 原地放货。 */
export class ForkliftDemo {
  private parent: THREE.Group
  private group = new THREE.Group()
  private forklift: DemoForklift
  private plan: ForkliftPathPlan
  private callbacks: ForkliftDemoCallbacks
  private phase: Phase = 'lift'
  private t = 0
  private next = 1
  private speed = 3.2
  private lineMat: THREE.MeshStandardMaterial

  constructor(parent: THREE.Group, pool: MaterialPool, plan: ForkliftPathPlan, cargoColor: string, callbacks: ForkliftDemoCallbacks) {
    this.parent = parent
    this.plan = plan
    this.callbacks = callbacks
    parent.add(this.group)
    this.forklift = buildDemoForklift(pool, cargoColor)
    this.group.add(this.forklift.group)

    this.lineMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.88, roughness: 0.4,
    })
    this.lineMat.userData.own = true
    this.buildPathVisual()

    const start = plan.points[0]
    this.forklift.group.position.set(start.x, 0, start.z)
    this.forklift.setForkHeight(0.18)
    this.faceTowards(plan.points[1] ?? start)
    callbacks.onStatus?.('已到达源货架，正在取货…')
  }

  private buildPathVisual() {
    if (this.plan.points.length > 1) {
      const curve = new THREE.CatmullRomCurve3(this.plan.points.map((p) => new THREE.Vector3(p.x, 0.055, p.z)))
      const geo = new THREE.TubeGeometry(curve, Math.max(24, this.plan.points.length * 4), 0.07, 8, false)
      this.group.add(new THREE.Mesh(geo, this.lineMat))
    }
    const start = this.plan.points[0]
    const end = this.plan.points[this.plan.points.length - 1]
    for (const [p, color] of [[start, 0x22c55e], [end, 0xf59e0b]] as [PathPoint, number][]) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      mat.userData.own = true
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.92, 28), mat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(p.x, 0.05, p.z)
      this.group.add(ring)
    }
  }

  private faceTowards(p: PathPoint) {
    const pos = this.forklift.group.position
    this.forklift.group.rotation.y = Math.atan2(p.x - pos.x, p.z - pos.z)
  }

  update(dt: number) {
    if (this.phase === 'done') return
    if (this.phase === 'lift') {
      this.t += dt
      const k = Math.min(this.t / 1.3, 1)
      this.forklift.setForkHeight(0.18 + k * 1.35)
      if (k >= 1) {
        this.forklift.setCargoVisible(true)
        this.callbacks.onPickup?.()
        this.phase = 'drive'
        this.callbacks.onStatus?.('已取货，沿路径前往目标货架…')
      }
      return
    }
    if (this.phase === 'drive') {
      this.drive(dt)
      return
    }
    this.t += dt
    const k = Math.min(this.t / 1.1, 1)
    this.forklift.setForkHeight(1.53 - k * 1.35)
    if (k >= 1) {
      this.forklift.setCargoVisible(false)
      this.callbacks.onDrop?.()
      this.callbacks.onStatus?.('搬运完成：货物已放入目标货架')
      this.lineMat.color.setHex(0x22c55e)
      this.lineMat.emissive.setHex(0x15803d)
      this.phase = 'done'
      this.callbacks.onDone?.()
    }
  }

  private drive(dt: number) {
    let remain = this.speed * dt
    while (remain > 0 && this.next < this.plan.points.length) {
      const pos = this.forklift.group.position
      const target = this.plan.points[this.next]
      const dist = Math.hypot(target.x - pos.x, target.z - pos.z)
      if (dist <= remain) {
        pos.set(target.x, 0, target.z)
        remain -= dist
        this.next++
      } else {
        const k = remain / dist
        pos.set(pos.x + (target.x - pos.x) * k, 0, pos.z + (target.z - pos.z) * k)
        remain = 0
      }
      this.faceTowards(target)
    }
    this.forklift.spinWheels(dt, this.speed)
    if (this.next >= this.plan.points.length) {
      this.phase = 'lower'
      this.t = 0
      this.callbacks.onStatus?.('已到达目标货架，正在放货…')
    }
  }

  dispose() {
    this.parent.remove(this.group)
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      o.geometry.dispose()
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m) => { if (m.userData.own) m.dispose() })
    })
    this.group.clear()
  }
}
