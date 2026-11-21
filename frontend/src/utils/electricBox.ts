import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MaterialPool } from './materialPool'

function makeHazardDecal(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 128, 128)
  ctx.beginPath(); ctx.moveTo(64, 10); ctx.lineTo(118, 112); ctx.lineTo(10, 112); ctx.closePath()
  ctx.lineWidth = 10; ctx.strokeStyle = '#facc15'; ctx.stroke()
  ctx.fillStyle = '#facc15'
  ctx.beginPath(); ctx.moveTo(68, 38); ctx.lineTo(48, 72); ctx.lineTo(64, 72); ctx.lineTo(56, 102); ctx.lineTo(82, 64); ctx.lineTo(66, 64); ctx.closePath(); ctx.fill()
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
}

function makeLouversTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, 0, 128, 128)
  for (let y = 10; y < 120; y += 10) {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(8, y, 112, 4)
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(8, y + 4, 112, 2)
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
}

/** 在厂区西北角放置一个低模 PBR 蓝色工业配电柜（混凝土底座 + 高压警示标 + 百叶散热孔 + 镀铬合页门锁）。 */
export function buildCornerElectricBox(group: THREE.Group, pool: MaterialPool) {
  const boxGroup = new THREE.Group()
  boxGroup.position.set(-41.2, 0, -65.5)
  boxGroup.rotation.y = Math.PI / 6

  // 1. 混凝土基座 (2.8m × 0.45m × 1.6m)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 1.6), pool.get('concrete_plinth'))
  plinth.position.y = 0.225; boxGroup.add(plinth)

  // 2. 蓝色工业烤漆主柜体 + 顶部防雨檐
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d5bbf, roughness: 0.42, metalness: 0.32 })
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.35, 1.25, 2, 0.03), blueMat)
  body.position.y = 0.45 + 1.175; boxGroup.add(body)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.1, 1.34), blueMat)
  hood.position.set(0, 0.45 + 2.35, 0.02); boxGroup.add(hood)

  // 3. 左右双门缝轮廓线
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x0f172a })
  const midSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.15, 0.02), seamMat)
  midSeam.position.set(0.32, 0.45 + 1.16, 0.63); boxGroup.add(midSeam)

  // 4. 高压闪电黄色三角警示贴纸
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: makeHazardDecal(), transparent: true }),
  )
  decal.position.set(-0.38, 0.45 + 1.85, 0.635); boxGroup.add(decal)

  // 5. 下部百叶窗散热孔（左门 3 列 + 右门 1 列）
  const louverMat = new THREE.MeshStandardMaterial({ map: makeLouversTex(), roughness: 0.5, metalness: 0.3 })
  for (const lx of [-0.75, -0.35, 0.05]) {
    const lv = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.72), louverMat)
    lv.position.set(lx, 0.45 + 0.62, 0.632); boxGroup.add(lv)
  }
  const lvRight = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.1), louverMat)
  lvRight.position.set(0.76, 0.45 + 0.78, 0.632); boxGroup.add(lvRight)

  // 6. 镀铬银色合页 (左) + 门把手 (中/右)
  const chromeMat = pool.get('stainless_steel')
  for (const hy of [0.45 + 0.55, 0.45 + 1.85]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.05), chromeMat)
    hinge.position.set(-1.18, hy, 0.63); boxGroup.add(hinge)
  }
  const handleMain = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.08), chromeMat)
  handleMain.position.set(0.18, 0.45 + 1.32, 0.66); boxGroup.add(handleMain)
  const handleRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.06), pool.get('black_hardware'))
  handleRight.position.set(1.06, 0.45 + 1.65, 0.65); boxGroup.add(handleRight)

  group.add(boxGroup)
}
