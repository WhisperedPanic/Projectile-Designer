<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Ballistic Die Designer</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.10/babel.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #0f172a; font-family: 'IBM Plex Mono', monospace; }
  #root { min-height: 100%; }

  /* Layout */
  .app { min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); padding: 24px; }
  .header { margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #f1f5f9; letter-spacing: -1px; }
  .header p  { font-size: 13px; color: #64748b; margin-top: 4px; }
  .layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

  /* Sidebar */
  .sidebar { display: flex; flex-direction: column; gap: 20px; max-height: calc(100vh - 140px); overflow-y: auto; padding-right: 4px; }
  .sidebar::-webkit-scrollbar { width: 4px; }
  .sidebar::-webkit-scrollbar-track { background: #1e293b; }
  .sidebar::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

  /* Section headers */
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e1; margin-bottom: 10px; }

  /* Input groups */
  .input-group { border: 1px solid rgba(148,163,184,0.25); border-radius: 6px; padding: 10px 12px; background: rgba(15,23,42,0.5); transition: border-color .2s, background .2s; margin-bottom: 8px; }
  .input-group:focus-within { border-color: #0ea5e9; background: rgba(15,23,42,0.85); box-shadow: 0 0 10px rgba(14,165,233,0.12); }
  .input-group label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 5px; }
  .input-field { width: 100%; background: rgba(51,65,85,0.5); border: 1px solid rgba(148,163,184,0.2); color: #e2e8f0; padding: 7px 10px; border-radius: 4px; font-family: inherit; font-size: 12px; outline: none; transition: border-color .2s; }
  .input-field:focus { border-color: #0ea5e9; }
  select.input-field { cursor: pointer; }
  option { background: #1e293b; }

  /* Volume conservation box */
  .vol-box { border-radius: 6px; padding: 10px 12px; font-size: 11px; margin-top: 10px; }
  .vol-box.ok  { border: 1px solid #10b981; background: rgba(16,185,129,0.08); }
  .vol-box.err { border: 1px solid #f59e0b; background: rgba(245,158,11,0.08); }
  .vol-row { display: flex; justify-content: space-between; margin-bottom: 4px; color: #94a3b8; }
  .vol-row span:last-child { color: #e2e8f0; }
  .vol-err-pct { color: #f59e0b; }
  .vol-ok-pct  { color: #10b981; }
  .vol-fix-btn { width: 100%; margin-top: 8px; padding: 5px; border-radius: 4px; background: rgba(245,158,11,0.25); border: 1px solid #f59e0b; color: #fef3c7; font-family: inherit; font-size: 11px; cursor: pointer; transition: background .2s; }
  .vol-fix-btn:hover { background: rgba(245,158,11,0.4); }
  .vol-ok-label { text-align: center; color: #10b981; margin-top: 4px; }

  /* Preset buttons */
  .preset-btn { display: block; width: 100%; text-align: left; padding: 7px 10px; background: rgba(51,65,85,0.4); border: 1px solid rgba(148,163,184,0.18); border-radius: 4px; color: #cbd5e1; font-family: inherit; font-size: 11px; cursor: pointer; transition: all .2s; margin-bottom: 5px; }
  .preset-btn:hover { border-color: #0ea5e9; color: #0ea5e9; background: rgba(51,65,85,0.65); }

  /* Action buttons */
  .action-row { display: flex; gap: 8px; padding-top: 14px; border-top: 1px solid #334155; }
  .action-btn { flex: 1; padding: 8px; background: rgba(51,65,85,0.5); border: 1px solid rgba(148,163,184,0.2); color: #cbd5e1; font-family: inherit; font-size: 12px; border-radius: 4px; cursor: pointer; transition: all .2s; }
  .action-btn:hover { background: rgba(51,65,85,0.75); border-color: #0ea5e9; color: #0ea5e9; }

  /* Main area */
  .main { display: flex; flex-direction: column; gap: 16px; }
  .canvas-wrap { background: rgba(30,41,59,0.6); border: 1px solid rgba(148,163,184,0.15); border-radius: 8px; overflow: auto; max-height: 820px; }
  canvas { display: block; }

  /* Station selector */
  .station-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .sta-btn { padding: 7px 12px; background: rgba(51,65,85,0.5); border: 1px solid rgba(148,163,184,0.2); color: #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 12px; cursor: pointer; transition: all .2s; }
  .sta-btn.active { background: #0ea5e9; border-color: #0284c7; color: #fff; box-shadow: 0 0 8px rgba(14,165,233,0.3); }
  .sta-btn:hover:not(.active) { border-color: #0ea5e9; }

  /* Metric cards */
  .metrics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .metrics-row4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 600px) { .metrics-row4 { grid-template-columns: repeat(2, 1fr); } }
  .card { background: linear-gradient(135deg, rgba(51,65,85,0.4), rgba(30,41,59,0.4)); border: 1px solid rgba(148,163,184,0.18); border-radius: 6px; padding: 12px; }
  .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 700; color: #0ea5e9; }
  .card-value.sm { font-size: 16px; }
  .card-value.ok { color: #10b981; }
  .card-value.warn { color: #ef4444; }
  .card-unit { font-size: 11px; color: #475569; margin-top: 2px; }

  /* Capacity bar */
  .cap-card { background: linear-gradient(135deg, rgba(51,65,85,0.4), rgba(30,41,59,0.4)); border: 1px solid rgba(148,163,184,0.18); border-radius: 6px; padding: 14px; }
  .cap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .cap-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
  .cap-warn { font-size: 11px; font-weight: 700; color: #ef4444; }
  .cap-sub { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
  .cap-sub span:last-child { color: #cbd5e1; }
  .bar-track { width: 100%; height: 10px; background: #334155; border-radius: 5px; overflow: hidden; margin-bottom: 10px; }
  .bar-fill { height: 100%; border-radius: 5px; transition: width .3s; }
  .bar-fill.ok   { background: #10b981; }
  .bar-fill.hi   { background: #f59e0b; }
  .bar-fill.over { background: #ef4444; }
  .station-breakdown { display: grid; gap: 6px; }
  .sta-row { text-align: center; }
  .sta-row-label { font-size: 10px; color: #475569; }
  .sta-row-val   { font-size: 11px; color: #cbd5e1; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useRef, useEffect } = React;

function App() {
  const canvasRef = useRef(null);

  const [stock, setStock] = useState({ diameter: 0.243, length: 1.0 });
  const [targetBullet, setTargetBullet] = useState({
    diameter: 0.243, oal: 1.059, boatTail: 0.165,
    noseLength: 0.544, baseToOgive: 0.587,
    bearingSurface: 0.360, ogiveRadius: 0.15
  });
  const [numStations,    setNumStations]    = useState(8);
  const [totalTonnage,   setTotalTonnage]   = useState(150);
  const [selectedStation,setSelectedStation]= useState(0);
  const [material,       setMaterial]       = useState('cu90zn10');
  const [frictionCoeff,  setFrictionCoeff]  = useState(0.12);

  const CANVAS_HEIGHT = Math.max(600, numStations * 100);
  const CANVAS_WIDTH  = 800;

  const MATERIALS = {
    'cu90zn10': { name: 'Cu90/Zn10 Gilding Metal', flowStress: 45000 },
    'cu70zn30': { name: 'Cu70/Zn30 Gilding Metal', flowStress: 40000 },
    'copper':   { name: 'Pure Copper (annealed)',   flowStress: 10000 },
    'brass':    { name: 'Brass (half-hard)',         flowStress: 50000 },
    'steel':    { name: 'Mild Steel',               flowStress: 90000 },
    'lead':     { name: 'Lead',                     flowStress: 2200  },
    'pb-sb':    { name: 'Lead-Antimony (2%)',        flowStress: 4500  },
  };

  // ── Tangent ogive (circular arc) ─────────────────────────────────────────
  const generateOgiveCurve = (diameter, noseLength, ogiveRadius, numPoints = 60) => {
    const points = [];
    const r = diameter / 2;
    const R = (noseLength * noseLength + r * r) / (2 * r);
    const cx = noseLength;
    const cy = r - R;
    for (let i = 0; i <= numPoints; i++) {
      const x  = (i / numPoints) * noseLength;
      const dx = x - cx;
      const y  = cy + Math.sqrt(Math.max(0, R * R - dx * dx));
      points.push({ x, y: Math.max(0, y) });
    }
    return points;
  };

  // ── Volume calculations ──────────────────────────────────────────────────
  const calcOgiveVolume = (diameter, noseLength, ogiveRadius) => {
    const pts = generateOgiveCurve(diameter, noseLength, ogiveRadius, 200);
    let vol = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx    = pts[i].x - pts[i-1].x;
      const r_avg = (pts[i].y + pts[i-1].y) / 2;
      vol += Math.PI * r_avg * r_avg * dx;
    }
    return vol;
  };

  const calcBulletVolume = (b) => {
    const r    = b.diameter / 2;
    const r_bt = r * 0.65;
    const V_n  = calcOgiveVolume(b.diameter, b.noseLength, b.ogiveRadius);
    const V_b  = Math.PI * r * r * b.bearingSurface;
    const V_bt = b.boatTail > 0
      ? (Math.PI * b.boatTail / 3) * (r*r + r*r_bt + r_bt*r_bt) : 0;
    return V_n + V_b + V_bt;
  };

  const bulletVolume       = calcBulletVolume(targetBullet);
  const stockVolume        = Math.PI * (stock.diameter/2)**2 * stock.length;
  const requiredStockLen   = bulletVolume / (Math.PI * (stock.diameter/2)**2);
  const volumeError        = ((stockVolume - bulletVolume) / bulletVolume) * 100;
  const volumeOk           = Math.abs(volumeError) < 0.5;

  // ── Intermediate bullet per station ─────────────────────────────────────
  const getIntermediateBullet = (i) => {
    if (i === 0) return {
      diameter: stock.diameter, oal: stock.length, boatTail: 0,
      noseLength: stock.length * 0.1, baseToOgive: stock.length * 0.05,
      bearingSurface: stock.length * 0.05, ogiveRadius: targetBullet.ogiveRadius
    };
    const p = i / (numStations - 1);
    return {
      diameter:       stock.diameter       + (targetBullet.diameter       - stock.diameter)       * p,
      oal:            stock.length         + (targetBullet.oal            - stock.length)         * p,
      boatTail:       targetBullet.boatTail * p,
      noseLength:     stock.length*0.1     + (targetBullet.noseLength     - stock.length*0.1)     * p,
      baseToOgive:    stock.length*0.05    + (targetBullet.baseToOgive    - stock.length*0.05)    * p,
      bearingSurface: targetBullet.bearingSurface * p,
      ogiveRadius:    targetBullet.ogiveRadius
    };
  };

  // ── Swaging force (Siebel formula) ───────────────────────────────────────
  const calculateStationForce = (idx) => {
    const cur  = getIntermediateBullet(idx);
    const prev = idx > 0 ? getIntermediateBullet(idx-1) : {
      diameter: stock.diameter, oal: stock.length,
      noseLength: stock.length*0.1, boatTail: 0, bearingSurface: 0
    };
    const sigma_f = MATERIALS[material].flowStress;
    const mu      = frictionCoeff;
    let F = 0;

    // 1. Body — solid cross-section reduction
    const r0 = prev.diameter/2, r1 = cur.diameter/2;
    const A0 = Math.PI*r0*r0, A1 = Math.PI*r1*r1;
    const eps = r0 > r1 ? Math.log(A0/A1) : 0;
    if (eps > 0) {
      const alpha = 10*Math.PI/180;
      F += sigma_f * A1 * (eps + (2*mu)/(3*Math.tan(alpha)));
    }

    // 2. Nose / ogive forming
    const dNose = cur.noseLength - prev.noseLength;
    if (dNose > 0 || idx === 0) {
      const L = cur.noseLength, r = cur.diameter/2;
      const a = Math.atan(r/L);
      const A_lat = Math.PI * r * Math.sqrt(L*L + r*r);
      F += sigma_f * A_lat * (Math.sin(a) + mu*Math.cos(a));
    }

    // 3. Boat tail forming
    const dBT = cur.boatTail - prev.boatTail;
    if (dBT > 0) {
      const r = cur.diameter/2, r2 = r*0.65;
      const ta = Math.atan((r-r2)/cur.boatTail);
      const A_bt = Math.PI*(r+r2)*Math.sqrt((r-r2)**2 + cur.boatTail**2);
      F += sigma_f * A_bt * (Math.sin(ta) + mu*Math.cos(ta)) * 0.5;
    }

    return Math.max(0.1, F/2000); // short tons
  };

  const stationForces    = Array.from({length: numStations}, (_, i) => calculateStationForce(i));
  const cumulativeTonnage= stationForces.reduce((a,b)=>a+b,0);
  const overCapacity     = cumulativeTonnage > totalTonnage;

  // ── Canvas drawing ───────────────────────────────────────────────────────
  const drawBullet = (ctx, bullet, cx, cy, scale, fill, color) => {
    const r       = (bullet.diameter/2)*scale;
    const oalPx   = bullet.oal*scale;
    const btPx    = bullet.boatTail*scale;
    const nosePx  = bullet.noseLength*scale;
    const tipX    = cx - oalPx/2;
    const baseX   = cx + oalPx/2;
    const btStartX= baseX - btPx;
    const pts     = generateOgiveCurve(bullet.diameter, bullet.noseLength, bullet.ogiveRadius);

    ctx.fillStyle   = color;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(tipX, cy);
    pts.forEach(p => ctx.lineTo(tipX + p.x*scale, cy - p.y*scale));
    ctx.lineTo(btStartX, cy - r);
    if (btPx > 0) {
      const tr = r*0.65;
      ctx.lineTo(baseX, cy - tr);
      ctx.lineTo(baseX, cy + tr);
    } else {
      ctx.lineTo(baseX, cy + r);
      ctx.lineTo(baseX, cy + r);
    }
    ctx.lineTo(btStartX, cy + r);
    for (let i = pts.length-1; i >= 0; i--)
      ctx.lineTo(tipX + pts[i].x*scale, cy + pts[i].y*scale);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  };

  const drawCavity = (ctx, bullet, cx, cy, scale, selected) => {
    const r    = (bullet.diameter/2)*scale;
    const oalPx= bullet.oal*scale;
    const pad  = 0.01*scale;
    ctx.strokeStyle = selected ? '#e74c3c' : '#f1c40f';
    ctx.lineWidth   = selected ? 3 : 2;
    ctx.setLineDash (selected ? [] : [4,4]);
    ctx.strokeRect(cx-oalPx/2-pad, cy-r-pad, oalPx+pad*2, r*2+pad*2);
    ctx.setLineDash([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(236,240,241,0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < CANVAS_WIDTH;  x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_HEIGHT); ctx.stroke(); }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH,y); ctx.stroke(); }

    const stH     = CANVAS_HEIGHT / numStations;
    const maxLen  = Math.max(stock.length, targetBullet.oal);
    const maxDia  = Math.max(stock.diameter, targetBullet.diameter);
    const scaleL  = (CANVAS_WIDTH*0.7) / maxLen;
    const scaleD  = (stH*0.6) / maxDia;
    const bScale  = Math.min(scaleL, scaleD);

    for (let i = 0; i < numStations; i++) {
      const top    = stH * i;
      const cy     = top + stH/2;
      const cx     = CANVAS_WIDTH/2;
      const bullet = getIntermediateBullet(i);
      const sel    = i === selectedStation;

      if (sel) {
        ctx.fillStyle = 'rgba(52,152,219,0.10)';
        ctx.fillRect(0, top, CANVAS_WIDTH, stH);
      }

      drawCavity(ctx, bullet, cx, cy, bScale, sel);
      ctx.globalAlpha = sel ? 1 : 0.72;
      drawBullet(ctx, bullet, cx, cy, bScale, true, sel ? '#3498db' : '#bdc3c7');
      ctx.globalAlpha = 1;

      // Labels
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px IBM Plex Mono'; ctx.textAlign = 'right';
      ctx.fillText(`S${i+1}`, 30, cy+5);

      ctx.fillStyle = overCapacity ? '#ef4444' : '#10b981';
      ctx.font = 'bold 11px IBM Plex Mono'; ctx.textAlign = 'left';
      ctx.fillText(`${stationForces[i].toFixed(1)}t`, CANVAS_WIDTH-48, cy+5);

      ctx.fillStyle = '#94a3b8'; ctx.font = '8px IBM Plex Mono'; ctx.textAlign = 'center';
      ctx.fillText(
        `Ø${bullet.diameter.toFixed(4)}"  OAL:${bullet.oal.toFixed(3)}"  BS:${bullet.bearingSurface.toFixed(3)}"`,
        cx, top + stH - 10
      );

      if (i < numStations-1) {
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, top+stH); ctx.lineTo(CANVAS_WIDTH, top+stH); ctx.stroke();
      }
    }
  }, [selectedStation, numStations, stock, targetBullet, stationForces]);

  // ── Presets ───────────────────────────────────────────────────────────────
  const PRESETS = {
    '6MM 88gr VLD':      { diameter:0.243, oal:1.059, boatTail:0.165, noseLength:0.544, baseToOgive:0.587, bearingSurface:0.360, ogiveRadius:0.15 },
    '22CAL 64gr FB':     { diameter:0.224, oal:0.819, boatTail:0.0,   noseLength:0.506, baseToOgive:0.410, bearingSurface:0.313, ogiveRadius:0.12 },
    '30CAL 230gr VLD':   { diameter:0.308, oal:1.668, boatTail:0.280, noseLength:0.859, baseToOgive:0.875, bearingSurface:0.529, ogiveRadius:0.20 },
  };

  const handleExport = () => {
    const c = canvasRef.current;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `die_design_${new Date().toISOString().slice(0,10)}.png`;
    a.click();
  };

  const handleReset = () => {
    setStock({diameter:0.243, length:1.0});
    setTargetBullet({...PRESETS['6MM 88gr VLD']});
    setNumStations(8); setTotalTonnage(150); setSelectedStation(0);
  };

  const selectedBullet = getIntermediateBullet(selectedStation);
  const capPct = Math.min(100, (cumulativeTonnage/totalTonnage)*100);
  const barCls = overCapacity ? 'bar-fill over' : capPct > 85 ? 'bar-fill hi' : 'bar-fill ok';

  return (
    <div className="app">
      <div className="header">
        <h1>BALLISTIC DIE DESIGN</h1>
        <p>Multi-station progressive die cavity visualisation · Solid projectile swaging analysis</p>
      </div>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">

          {/* Stock */}
          <div>
            <div className="section-title">Blank Stock</div>
            <div className="input-group">
              <label>Diameter (in)</label>
              <input type="number" step="0.001" className="input-field" value={stock.diameter}
                onChange={e => setStock(s=>({...s, diameter:parseFloat(e.target.value)||0}))} />
            </div>
            <div className="input-group">
              <label>Length (in)</label>
              <input type="number" step="0.001" className="input-field" value={stock.length}
                onChange={e => setStock(s=>({...s, length:parseFloat(e.target.value)||0}))} />
            </div>

            {/* Volume conservation */}
            <div className={`vol-box ${volumeOk ? 'ok' : 'err'}`}>
              <div className="vol-row"><span>Stock vol</span><span>{(stockVolume*1000).toFixed(4)} ×10⁻³ in³</span></div>
              <div className="vol-row"><span>Bullet vol</span><span>{(bulletVolume*1000).toFixed(4)} ×10⁻³ in³</span></div>
              <div className="vol-row">
                <span>Error</span>
                <span className={volumeOk ? 'vol-ok-pct' : 'vol-err-pct'}>
                  {volumeError > 0 ? '+' : ''}{volumeError.toFixed(2)}%
                </span>
              </div>
              {volumeOk
                ? <div className="vol-ok-label">✓ Volume conserved</div>
                : <button className="vol-fix-btn"
                    onClick={() => setStock(s=>({...s, length:parseFloat(requiredStockLen.toFixed(4))}))}>
                    Set length → {requiredStockLen.toFixed(4)}"
                  </button>
              }
            </div>
          </div>

          {/* Target bullet */}
          <div>
            <div className="section-title">Target Profile</div>
            {Object.entries(PRESETS).map(([k,v])=>(
              <button key={k} className="preset-btn" onClick={()=>setTargetBullet({...v})}>{k}</button>
            ))}
            {[
              ['Diameter (in)',       'diameter',       0.001],
              ['OAL (in)',            'oal',            0.001],
              ['Boat Tail (in)',      'boatTail',       0.001],
              ['Nose Length (in)',    'noseLength',     0.001],
              ['Base to Ogive (in)', 'baseToOgive',    0.001],
              ['Bearing Surface (in)','bearingSurface', 0.001],
              ['Ogive Radius (in)',   'ogiveRadius',    0.01 ],
            ].map(([label, key, step])=>(
              <div className="input-group" key={key}>
                <label>{label}</label>
                <input type="number" step={step} className="input-field"
                  value={targetBullet[key]}
                  onChange={e=>setTargetBullet(b=>({...b,[key]:parseFloat(e.target.value)||0}))} />
              </div>
            ))}
          </div>

          {/* Press */}
          <div>
            <div className="section-title">Press</div>
            <div className="input-group">
              <label>Stations</label>
              <input type="number" min="2" max="12" className="input-field" value={numStations}
                onChange={e=>{ const v=Math.max(2,Math.min(12,parseInt(e.target.value)||2)); setNumStations(v); setSelectedStation(s=>Math.min(s,v-1)); }} />
            </div>
            <div className="input-group">
              <label>Press Capacity (t cumulative)</label>
              <input type="number" className="input-field" value={totalTonnage}
                onChange={e=>setTotalTonnage(parseFloat(e.target.value)||1)} />
            </div>
          </div>

          {/* Material */}
          <div>
            <div className="section-title">Material</div>
            <div className="input-group">
              <label>Projectile Material</label>
              <select className="input-field" value={material} onChange={e=>setMaterial(e.target.value)}>
                {Object.entries(MATERIALS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Friction Coeff (μ)</label>
              <input type="number" step="0.01" min="0.05" max="0.3" className="input-field"
                value={frictionCoeff} onChange={e=>setFrictionCoeff(parseFloat(e.target.value)||0.12)} />
            </div>
          </div>

          {/* Actions */}
          <div className="action-row">
            <button className="action-btn" onClick={handleReset}>↺ Reset</button>
            <button className="action-btn" onClick={handleExport}>↓ Export PNG</button>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div className="main">
          <div className="canvas-wrap">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          </div>

          {/* Station selector */}
          <div>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:1,color:'#64748b',marginBottom:8}}>Select Station</div>
            <div className="station-grid">
              {Array.from({length:numStations},(_,i)=>(
                <button key={i} className={`sta-btn${selectedStation===i?' active':''}`}
                  onClick={()=>setSelectedStation(i)}>S{i+1}</button>
              ))}
            </div>
          </div>

          {/* Force cards */}
          <div className="metrics-row">
            <div className="card">
              <div className="card-label">S{selectedStation+1} Station Force</div>
              <div className={`card-value${overCapacity?' warn':''}`}>{stationForces[selectedStation]?.toFixed(2)}t</div>
            </div>
            <div className="card">
              <div className="card-label">Cumulative Press Load</div>
              <div className={`card-value${overCapacity?' warn':' ok'}`}>{cumulativeTonnage.toFixed(2)}t</div>
            </div>
          </div>

          {/* Profile specs */}
          <div className="metrics-row4">
            {[
              ['Diameter', selectedBullet.diameter.toFixed(4), 'in'],
              ['OAL',      selectedBullet.oal.toFixed(4),      'in'],
              ['Nose Len', selectedBullet.noseLength.toFixed(4),'in'],
              ['Bearing',  selectedBullet.bearingSurface.toFixed(4),'in'],
            ].map(([label,val,unit])=>(
              <div className="card" key={label}>
                <div className="card-label">{label}</div>
                <div className="card-value sm">{val}</div>
                <div className="card-unit">{unit}</div>
              </div>
            ))}
          </div>

          {/* Capacity bar */}
          <div className="cap-card">
            <div className="cap-header">
              <span className="cap-label">Cumulative Press Load vs Capacity</span>
              {overCapacity && <span className="cap-warn">⚠ OVER CAPACITY</span>}
            </div>
            <div className="cap-sub">
              <span>{cumulativeTonnage.toFixed(2)}t across {numStations} stations</span>
              <span>{totalTonnage}t press</span>
            </div>
            <div className="bar-track">
              <div className={barCls} style={{width:`${capPct}%`}} />
            </div>
            <div className="station-breakdown" style={{gridTemplateColumns:`repeat(${numStations},1fr)`}}>
              {stationForces.map((f,i)=>(
                <div className="sta-row" key={i}>
                  <div className="sta-row-label">S{i+1}</div>
                  <div className="sta-row-val">{f.toFixed(1)}t</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>