import * as THREE from 'three'

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const screenTex = makeCanvas(256, 128, (ctx) => {
  const grad = ctx.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#0b1220')
  grad.addColorStop(1, '#111c33')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 128)
  ctx.strokeStyle = 'rgba(56,189,248,0.18)'
  for (let x = 0; x < 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke() }
  for (let y = 0; y < 128; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke() }
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 20px monospace'
  ctx.fillText('OEE 94.2%', 12, 30)
  ctx.font = '14px monospace'
  ctx.fillStyle = '#34d399'
  ctx.fillText('RUN  SPEED 82%', 12, 52)
  ctx.fillStyle = '#475569'
  ctx.font = '12px monospace'
  ctx.fillText('STATUS: NORMAL', 12, 118)
  const bars = [22, 40, 34, 58, 46, 70, 52, 64, 48, 76]
  bars.forEach((h, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#0ea5e9'
    ctx.fillRect(14 + i * 22, 64 - h / 2, 12, h)
  })
})

const hazardTex = makeCanvas(128, 64, (ctx) => {
  ctx.fillStyle = '#facc15'
  ctx.fillRect(0, 0, 128, 64)
  ctx.save()
  ctx.translate(32, 32)
  ctx.rotate(-Math.PI / 4)
  ctx.fillStyle = '#0f172a'
  for (let i = -6; i < 6; i += 2) ctx.fillRect(i * 12, -48, 12, 96)
  ctx.restore()
})

const ventTex = makeCanvas(128, 128, (ctx) => {
  ctx.fillStyle = '#334155'
  ctx.fillRect(0, 0, 128, 128)
  for (let y = 8; y < 124; y += 9) {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(6, y, 116, 4)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(6, y + 4, 116, 2)
  }
})

const gaugeTex = makeCanvas(128, 128, (ctx) => {
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.stroke()
  for (let a = -0.75 * Math.PI; a <= 0.75 * Math.PI; a += Math.PI / 8) {
    ctx.beginPath(); ctx.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46)
    ctx.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38); ctx.stroke()
  }
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(-0.35) * 42, 64 + Math.sin(-0.35) * 42); ctx.stroke()
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(64, 64, 7, 0, Math.PI * 2); ctx.fill()
})

function led(color: number, intensity = 1.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35 })
}

/** 设备专用共享材质池（与 MaterialPool 分开，避免污染仓储材质缓存）。 */
export const EM = {
  orange: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.55 }),
  deepBlue: new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.35, metalness: 0.5 }),
  navy: new THREE.MeshStandardMaterial({ color: 0x0f2744, roughness: 0.4, metalness: 0.45 }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.45, metalness: 0.55 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xd8d5c8, roughness: 0.45, metalness: 0.15 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.42, metalness: 0.75 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x0f172a, transparent: true, opacity: 0.32,
    roughness: 0.12, metalness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.1,
  }),
  screen: new THREE.MeshStandardMaterial({
    map: screenTex, emissive: 0x38bdf8, emissiveMap: screenTex, emissiveIntensity: 0.85, roughness: 0.38,
  }),
  hazard: new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6, metalness: 0.1 }),
  vent: new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.7, metalness: 0.25 }),
  gauge: new THREE.MeshStandardMaterial({ map: gaugeTex, roughness: 0.35, metalness: 0.2 }),
  ledGreen: led(0x22c55e),
  ledAmber: led(0xf59e0b),
  ledBlue: led(0x38bdf8),
  ledRed: led(0xef4444),
}
