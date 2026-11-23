import * as THREE from 'three'
import { MaterialPool } from './materialPool'

function makeFlangeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#b98955'; ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = y % 44 === 0 ? 'rgba(120,75,30,0.22)' : 'rgba(220,185,135,0.14)'
    ctx.fillRect(0, y, 256, 20)
    ctx.fillStyle = 'rgba(40,25,10,0.45)'; ctx.fillRect(0, y + 20, 256, 2)
  }
  ctx.save(); ctx.translate(128, 128)
  for (let a = 0; a < 4; a++) {
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(-10, 20, 20, 96)
    ctx.fillStyle = '#475569'; ctx.fillRect(-5, 98, 10, 10)
  }
  ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
}

/** 整齐排列的大型木质电缆盘：电缆卷使用与墙面同款的 4 通道 PBR（Albedo + Normal + Roughness + AO）。 */
export function buildCableReels(group: THREE.Group, pool: MaterialPool) {
  const reels: [number, number, number][] = []
  for (const sideX of [-24, -20.5, -17, 17, 20.5, 24]) {
    for (const rowZ of [-52, -48.5, 48.5, 52]) {
      reels.push([sideX, 0, rowZ])
    }
  }

  const ld = new THREE.TextureLoader()
  const cMap = ld.load(`${import.meta.env.BASE_URL}textures/cable_albedo.jpg`); cMap.colorSpace = THREE.SRGBColorSpace
  const cNorm = ld.load(`${import.meta.env.BASE_URL}textures/cable_normal.jpg`)
  const cRough = ld.load(`${import.meta.env.BASE_URL}textures/cable_rough.jpg`)
  const cAo = ld.load(`${import.meta.env.BASE_URL}textures/cable_ao.jpg`)

  const flangeMat = pool.get('pallet_wood')
  const coilMat = new THREE.MeshStandardMaterial({
    map: cMap,
    normalMap: cNorm,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: cRough,
    aoMap: cAo,
    aoMapIntensity: 0.85,
    roughness: 1.0,
    metalness: 0.12,
    envMapIntensity: 0.8,
  })
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 })

  const flangeGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.09, 24)
  const coilGeo = new THREE.CylinderGeometry(0.84, 0.84, 1.22, 24)
  coilGeo.setAttribute('uv2', coilGeo.attributes.uv)
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.46, 14)

  const instL = new THREE.InstancedMesh(flangeGeo, flangeMat, reels.length)
  const instR = new THREE.InstancedMesh(flangeGeo, flangeMat, reels.length)
  const instC = new THREE.InstancedMesh(coilGeo, coilMat, reels.length)
  const instH = new THREE.InstancedMesh(hubGeo, hubMat, reels.length)

  const d = new THREE.Object3D()
  reels.forEach(([rx, _, rz], i) => {
    const cy = 1.05
    const setPart = (inst: THREE.InstancedMesh, localX: number) => {
      d.position.set(rx + localX, cy, rz)
      d.rotation.set(0, 0, Math.PI / 2)
      d.scale.set(1, 1, 1)
      d.updateMatrix()
      inst.setMatrixAt(i, d.matrix)
    }
    setPart(instL, -0.64)
    setPart(instR, 0.64)
    setPart(instC, 0)
    setPart(instH, 0)
  })

  for (const inst of [instL, instR, instC, instH]) {
    inst.castShadow = true; inst.receiveShadow = true; inst.matrixAutoUpdate = false; inst.updateMatrix(); group.add(inst)
  }
}
