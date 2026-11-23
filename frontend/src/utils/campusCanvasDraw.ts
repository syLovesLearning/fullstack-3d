import { CAMPUS_H, CAMPUS_W, doorWorldPos } from './campusRoadGraph'
import { KIND_META, RESERVE_LIMIT, type CampusSimState } from './campusSimEngine'

export interface ViewTransform { viewScale: number; padX: number; padY: number }

export function computeCampusTransform(w: number, h: number): ViewTransform {
  const viewScale = Math.max(0.05, Math.min((w - 20) / CAMPUS_W, (h - 20) / CAMPUS_H))
  return { viewScale, padX: (w - CAMPUS_W * viewScale) / 2, padY: (h - CAMPUS_H * viewScale) / 2 }
}

export function drawCampusScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  st: CampusSimState,
  opts: { selectedZoneId?: string; selectedSubId?: string; selectedRoadId?: string; conflictZoneId?: string; simMode?: boolean },
) {
  if (w <= 0 || h <= 0) return
  const { viewScale, padX, padY } = computeCampusTransform(w, h)
  const toPx = (mx: number, my: number) => ({ x: padX + mx * viewScale, y: padY + my * viewScale })
  ctx.clearRect(0, 0, w, h)
  const o = toPx(0, 0)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(o.x, o.y, CAMPUS_W * viewScale, CAMPUS_H * viewScale)
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1
  for (let gx = 0; gx <= CAMPUS_W; gx += 20) { const p = toPx(gx, 0); ctx.beginPath(); ctx.moveTo(p.x, o.y); ctx.lineTo(p.x, o.y + CAMPUS_H * viewScale); ctx.stroke() }
  for (let gy = 0; gy <= CAMPUS_H; gy += 20) { const p = toPx(0, gy); ctx.beginPath(); ctx.moveTo(o.x, p.y); ctx.lineTo(o.x + CAMPUS_W * viewScale, p.y); ctx.stroke() }

  for (const rd of st.greenRoads) {
    const rp = toPx(rd.x, rd.y), rw = rd.w * viewScale, rh = rd.h * viewScale
    const isSel = Boolean(opts.selectedRoadId && rd.id === opts.selectedRoadId)
    ctx.fillStyle = isSel ? 'rgba(52, 211, 153, 0.38)' : (rd.isSpur ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.22)')
    ctx.fillRect(rp.x, rp.y, rw, rh)
    ctx.save()
    ctx.strokeStyle = isSel ? '#facc15' : (rd.isSpur ? 'rgba(52, 211, 153, 0.55)' : '#10b981')
    ctx.lineWidth = isSel ? 2 : (rd.isSpur ? 1 : 1.3)
    if (!rd.isSpur && !isSel) ctx.setLineDash([4, 3])
    ctx.strokeRect(rp.x, rp.y, rw, rh)
    ctx.restore()
    if (rd.label) {
      ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(rd.label, rp.x + rw / 2, rp.y + rh / 2)
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    }
  }

  const nowMs = performance.now()
  for (const z of st.zones) {
    const tl = toPx(z.x, z.y), pw = z.w * viewScale, ph = z.h * viewScale
    const isConflict = Boolean(opts.conflictZoneId && z.id === opts.conflictZoneId)
    ctx.fillStyle = isConflict ? '#ef4444' : z.color
    ctx.globalAlpha = isConflict ? 0.42 : 0.22
    ctx.fillRect(tl.x, tl.y, pw, ph)
    ctx.globalAlpha = 1
    if (z.zone_type === 'dock') {
      for (let b = 0; b < 6; b++) { ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(tl.x + 8 + b * ((pw - 16) / 6), tl.y + ph - 24 * viewScale, (pw - 16) / 6 - 4, 18 * viewScale) }
    } else {
      ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,0.16)'; ctx.setLineDash([4, 4])
      const midP = toPx(z.x + z.w * 0.5, z.y + z.h * 0.58)
      ctx.beginPath(); ctx.moveTo(tl.x + 4, midP.y); ctx.lineTo(tl.x + pw - 4, midP.y); ctx.moveTo(midP.x, tl.y + 24); ctx.lineTo(midP.x, tl.y + ph - 4); ctx.stroke(); ctx.restore()
    }
    ctx.strokeStyle = isConflict ? '#ef4444' : (z.id === opts.selectedZoneId ? '#facc15' : '#64748b')
    ctx.lineWidth = isConflict || z.id === opts.selectedZoneId ? 2 : 1.5
    ctx.strokeRect(tl.x, tl.y, pw, ph)
    const subs = st.subZones.filter((s) => s.parentId === z.id)
    const totalReserve = subs.reduce((acc, s) => acc + s.stock, 0)
    ctx.fillStyle = isConflict ? '#fecaca' : '#f8fafc'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.fillText(z.name, tl.x + 5, tl.y + 12)
    ctx.fillStyle = isConflict ? '#fca5a5' : '#cbd5e1'; ctx.font = '9px monospace'
    ctx.fillText(isConflict ? '位置冲突 · 禁止放置' : (z.zone_type === 'dock' ? `货车泊位 ${st.trucks.length}/6` : (opts.simMode ? `预留 ${totalReserve} · 5点位` : `(${Math.round(z.x)}, ${Math.round(z.y)}) ${z.w}×${z.h}m`)), tl.x + 5, tl.y + 22)

    if (opts.simMode) {
      for (const s of subs) {
        const sp = toPx(s.x, s.y), pr = Math.max(2, s.r * viewScale), meta = KIND_META[s.kind], isOver = s.stock > RESERVE_LIMIT, isSel = opts.selectedSubId === s.id
        if (isOver) {
          ctx.beginPath(); ctx.arc(sp.x, sp.y, pr + 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(239, 68, 68, ${(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(nowMs / 130))).toFixed(2)})`; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(sp.x, sp.y, pr, 0, Math.PI * 2)
        ctx.fillStyle = isOver ? 'rgba(220, 38, 38, 0.48)' : meta.fill; ctx.fill()
        ctx.lineWidth = isSel ? 2 : 1.2; ctx.strokeStyle = isOver ? '#ef4444' : (isSel ? '#facc15' : 'rgba(148,163,184,0.45)'); ctx.stroke()
        if (!isOver) {
          ctx.beginPath(); ctx.arc(sp.x, sp.y, pr + 2, -Math.PI / 2, -Math.PI / 2 + Math.min(1, s.prodProg) * Math.PI * 2)
          ctx.strokeStyle = meta.stroke; ctx.lineWidth = 1.9; ctx.stroke()
        }
        ctx.fillStyle = isOver ? '#fecaca' : '#ffffff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(s.stock), sp.x, sp.y + 0.5)
        ctx.font = '8px Inter, sans-serif'; ctx.fillStyle = isOver ? '#fca5a5' : meta.text
        ctx.fillText(isOver ? '停产!' : s.shortLabel, sp.x, sp.y - pr - 6); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }
    }
    for (const d of z.doors) {
      const wp = toPx(doorWorldPos(z, d).x, doorWorldPos(z, d).y)
      ctx.fillStyle = d.open ? '#10b981' : '#ef4444'
      if (d.side === 'top' || d.side === 'bottom') ctx.fillRect(wp.x - 5, wp.y - 2.5, 10, 5)
      else ctx.fillRect(wp.x - 2.5, wp.y - 5, 5, 10)
    }
  }
  if (!opts.simMode) return

  const pulse = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(nowMs / 150))
  for (const f of st.flows.filter((fl) => fl.status === 'pending').slice(0, 3)) {
    const p1 = toPx(f.pickPt.x, f.pickPt.y), p2 = toPx(f.dropPt.x, f.dropPt.y)
    ctx.save(); ctx.strokeStyle = `rgba(252, 165, 165, ${pulse.toFixed(2)})`; ctx.lineWidth = 1.8; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -(nowMs / 40) % 24
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore()
  }
  for (const tr of st.trucks) {
    const p = toPx(tr.x, tr.y)
    ctx.fillStyle = '#818cf8'; ctx.fillRect(p.x - 5 * viewScale, p.y - 8 * viewScale, 10 * viewScale, 16 * viewScale)
    ctx.fillStyle = '#e0e7ff'; ctx.fillRect(p.x - 4 * viewScale, p.y - 10 * viewScale, 8 * viewScale, 3 * viewScale)
  }
  for (const fk of st.forklifts) {
    if (fk.state !== 'IDLE' && fk.path.length > 1) {
      ctx.strokeStyle = fk.blocked ? 'rgba(244,63,94,0.5)' : 'rgba(56,189,248,0.32)'; ctx.lineWidth = 1.3; ctx.beginPath()
      for (let i = Math.max(0, fk.pathIdx - 1); i < fk.path.length; i++) { const pp = toPx(fk.path[i].x, fk.path[i].y); i === Math.max(0, fk.pathIdx - 1) ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y) }
      ctx.stroke()
    }
    const fp = toPx(fk.x, fk.y)
    ctx.save(); ctx.translate(fp.x, fp.y); ctx.rotate(fk.angle)
    ctx.fillStyle = fk.blocked ? '#f43f5e' : (fk.state === 'IDLE' ? '#64748b' : (fk.state === 'TO_DROPOFF' || fk.state === 'UNLOADING' ? '#facc15' : '#38bdf8'))
    ctx.fillRect(-4.5, -3, 9, 6)
    if (fk.state === 'TO_DROPOFF' || fk.state === 'LIFTING') { ctx.fillStyle = '#d97706'; ctx.fillRect(3.5, -2, 3.5, 4) }
    ctx.restore()
    if (fk.blocked) { ctx.fillStyle = '#fda4af'; ctx.font = 'bold 9px Inter, sans-serif'; ctx.fillText('堵', fp.x + 5, fp.y - 4) }
  }
}
