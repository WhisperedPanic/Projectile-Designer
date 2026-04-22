import { useState, useCallback, useRef } from "react";
import {
  computeProjectileOutline,
  computeNoseOutline,
  computeBallisticEstimate,
  getDefaultParams,
  ProjectileParams,
  OgiveType,
} from "@/lib/projectileGeometry";

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

type UnitSystem = "in" | "mm";

const IN_TO_MM = 25.4;

function toDisplay(inches: number, unit: UnitSystem) {
  return unit === "mm" ? inches * IN_TO_MM : inches;
}
function fromDisplay(val: number, unit: UnitSystem) {
  return unit === "mm" ? val / IN_TO_MM : val;
}
function fmtLen(inches: number, unit: UnitSystem, decimals?: number) {
  const v = toDisplay(inches, unit);
  const d = decimals !== undefined ? decimals : (unit === "mm" ? 2 : 3);
  return `${v.toFixed(d)} ${unit}`;
}
function unitSymbol(unit: UnitSystem) {
  return unit === "mm" ? "mm" : '"';
}

// ---------------------------------------------------------------------------
// OGIVE meta
// ---------------------------------------------------------------------------

const OGIVE_LABELS: Record<OgiveType, string> = {
  tangent: "Tangent Ogive",
  secant: "Secant Ogive",
  hybrid: "Hybrid Ogive",
};

const OGIVE_DESCRIPTIONS: Record<OgiveType, string> = {
  tangent:
    "The arc is tangent to the cylindrical body at the shoulder — the most common form, blending smoothly into the shank.",
  secant:
    "The arc intersects the body at a slight angle, producing lower wave drag at supersonic speeds with a crisper shoulder transition.",
  hybrid:
    "Blends tangent and secant geometry: reduced wave drag with a softer shoulder transition than a pure secant.",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ParamSlider({
  label,
  displayUnit,
  displayValue,
  displayMin,
  displayMax,
  displayStep,
  onDisplayChange,
}: {
  label: string;
  displayUnit: string;
  displayValue: number;
  displayMin: number;
  displayMax: number;
  displayStep: number;
  onDisplayChange: (v: number) => void;
}) {
  const decimals = displayStep < 0.1 ? 3 : displayStep < 1 ? 2 : 1;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-mono text-slate-900">
          {displayValue.toFixed(decimals)}
          <span className="text-xs text-slate-400 ml-0.5">{displayUnit}</span>
        </span>
      </div>
      <input
        type="range"
        min={displayMin}
        max={displayMax}
        step={displayStep}
        value={displayValue}
        onChange={e => onDisplayChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-slate-700 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{displayMin}{displayUnit}</span>
        <span>{displayMax}{displayUnit}</span>
      </div>
    </div>
  );
}

function OgiveSelector({ value, onChange }: { value: OgiveType; onChange: (v: OgiveType) => void }) {
  const types: OgiveType[] = ["tangent", "secant", "hybrid"];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ogive Geometry</span>
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
        {types.map(t => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all duration-150 ${
              value === t
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 leading-snug">{OGIVE_DESCRIPTIONS[value]}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</span>
      <span className="font-mono text-slate-900 font-semibold text-sm leading-tight">{value}</span>
      {sub && <span className="text-xs text-slate-400 leading-tight">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProjectileDrawer() {
  const [params, setParams] = useState<ProjectileParams>(getDefaultParams());
  const [unit, setUnit] = useState<UnitSystem>("in");
  const svgRef = useRef<SVGSVGElement>(null);

  const update = useCallback(<K extends keyof ProjectileParams>(key: K, val: ProjectileParams[K]) => {
    setParams(p => ({ ...p, [key]: val }));
  }, []);

  const { caliber, overallLength, noseLength, boatTailLength, boatTailAngle } = params;
  const R = caliber / 2;
  const boatTailR = Math.max(R - boatTailLength * Math.tan((boatTailAngle * Math.PI) / 180), 0.005);
  const bodyLength = Math.max(overallLength - noseLength - boatTailLength, 0);
  const OAL = overallLength;

  // Ballistic & volume estimates
  const bc = computeBallisticEstimate(params);

  // Model → SVG: base on LEFT (x=0), tip on RIGHT (x=OAL)
  // svgX = OAL − modelX,  svgY = −modelY
  const toSvg = (p: { x: number; y: number }) => ({ x: OAL - p.x, y: -p.y });

  const outlineSvg = computeProjectileOutline(params).map(toSvg);
  const noseTopSvg = computeNoseOutline(params).map(toSvg);

  const polyStr = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(" ");

  // Key SVG x positions (after flip: base=0, tip=OAL)
  const svgBase    = 0;
  const svgBTEnd   = boatTailLength;
  const svgBodyEnd = boatTailLength + bodyLength;
  const svgTip     = OAL;

  // Padding & viewbox
  const PAD       = R * 2.1;
  const viewMinX  = -PAD;
  const viewMinY  = -(R + PAD);
  const viewW     = OAL + PAD * 2;
  const viewH     = (R + PAD) * 2;
  const textSize  = R * 0.16;
  const dimBelow  = R + PAD * 0.35;
  const dimAbove  = -(R + PAD * 0.35);
  const oalY      = R + PAD * 0.78;

  const us = unitSymbol(unit);

  function dimArrow(x1: number, x2: number, y: number, label: string, above = false) {
    const mid = (x1 + x2) / 2;
    const dy = above ? -textSize * 1.4 : textSize * 1.4;
    return (
      <g key={label}>
        <line x1={x1} y1={y} x2={x2} y2={y}
          stroke="#94a3b8" strokeWidth={R * 0.014}
          markerStart="url(#aS)" markerEnd="url(#aE)" />
        <line x1={x1} y1={0} x2={x1} y2={y}
          stroke="#cbd5e1" strokeWidth={R * 0.01}
          strokeDasharray={`${R * 0.05} ${R * 0.03}`} />
        <line x1={x2} y1={0} x2={x2} y2={y}
          stroke="#cbd5e1" strokeWidth={R * 0.01}
          strokeDasharray={`${R * 0.05} ${R * 0.03}`} />
        <text x={mid} y={y + dy}
          textAnchor="middle" fontSize={textSize}
          fill="#64748b" fontFamily="monospace">{label}</text>
      </g>
    );
  }

  // Download helpers
  const downloadSVG = () => {
    if (!svgRef.current) return;
    const str = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([str], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "projectile-outline.svg"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const str = new XMLSerializer().serializeToString(svgRef.current);
    const scale = 400;
    const W = Math.round(viewW * scale);
    const H = Math.round(viewH * scale);
    const blob = new Blob([str], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => {
        if (!b) return;
        const pu = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = pu; a.download = "projectile-outline.png"; a.click();
        URL.revokeObjectURL(pu);
      });
    };
    img.src = url;
  };

  // Slider helper — converts between display units and internal inches
  function makeSlider(
    label: string,
    key: keyof Pick<ProjectileParams, "caliber" | "overallLength" | "noseLength" | "boatTailLength">,
    minIn: number, maxIn: number, stepIn: number
  ) {
    const factor = unit === "mm" ? IN_TO_MM : 1;
    return (
      <ParamSlider
        key={key + unit}
        label={label}
        displayUnit={us}
        displayValue={toDisplay(params[key] as number, unit)}
        displayMin={minIn * factor}
        displayMax={maxIn * factor}
        displayStep={stepIn * factor}
        onDisplayChange={v => update(key, fromDisplay(v, unit))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-full lg:w-80 xl:w-96 bg-white border-r border-slate-100 shadow-sm flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Spitzer Boat Tail</h1>
            <p className="text-xs text-slate-500 mt-0.5">Projectile Outline Generator</p>
          </div>
          {/* Unit toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mt-0.5">
            {(["in", "mm"] as UnitSystem[]).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  unit === u
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <OgiveSelector value={params.ogiveType} onChange={v => update("ogiveType", v)} />

          <div className="border-t border-slate-100 pt-5 flex flex-col gap-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Dimensions</p>
            {makeSlider("Caliber (Diameter)", "caliber",      0.172, 0.510, 0.001)}
            {makeSlider("Overall Length",    "overallLength", 0.5,   2.5,   0.01)}
            {makeSlider("Nose Length",       "noseLength",    0.1,   1.2,   0.01)}
            {makeSlider("Boat Tail Length",  "boatTailLength",0.05,  0.40,  0.005)}
            <ParamSlider
              key="bta"
              label="Boat Tail Angle"
              displayUnit="°"
              displayValue={boatTailAngle}
              displayMin={3} displayMax={20} displayStep={0.5}
              onDisplayChange={v => update("boatTailAngle", v)}
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Caliber",    fmtLen(caliber, unit)],
                ["OAL",        fmtLen(OAL, unit)],
                ["Nose",       fmtLen(noseLength, unit)],
                ["Body",       fmtLen(bodyLength, unit)],
                ["BT Length",  fmtLen(boatTailLength, unit)],
                ["BT Angle",   `${boatTailAngle.toFixed(1)}°`],
                ["BT Base ⌀",  fmtLen(boatTailR * 2, unit)],
                ["Ogive",      OGIVE_LABELS[params.ogiveType]],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-xs">{k}</span>
                  <span className="font-mono text-slate-800 font-medium text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          <button onClick={downloadSVG}
            className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors">
            Download SVG
          </button>
          <button onClick={downloadPNG}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors">
            Download PNG
          </button>
        </div>
      </aside>

      {/* ── Main drawing area ────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 bg-slate-50 gap-6">

        {/* Drawing card */}
        <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Cross-Section View</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded">
              {OGIVE_LABELS[params.ogiveType]}
            </span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`${viewMinX} ${viewMinY} ${viewW} ${viewH}`}
            width="100%"
            style={{ background: "#fff", display: "block" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker id="aS" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                <path d="M5,0 L5,5 L0,2.5 z" fill="#94a3b8" />
              </marker>
              <marker id="aE" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,5 L5,2.5 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Centreline */}
            <line x1={viewMinX} y1={0} x2={viewMinX + viewW} y2={0}
              stroke="#e2e8f0" strokeWidth={R * 0.012}
              strokeDasharray={`${R * 0.07} ${R * 0.04}`} />

            {/* Section separator dashes */}
            <line x1={svgBTEnd} y1={-R} x2={svgBTEnd} y2={R}
              stroke="#cbd5e1" strokeWidth={R * 0.012}
              strokeDasharray={`${R * 0.05} ${R * 0.03}`} />
            {bodyLength > 0.02 && (
              <line x1={svgBodyEnd} y1={-R} x2={svgBodyEnd} y2={R}
                stroke="#cbd5e1" strokeWidth={R * 0.012}
                strokeDasharray={`${R * 0.05} ${R * 0.03}`} />
            )}

            {/* Main outline */}
            <polygon
              points={polyStr(outlineSvg)}
              fill="#f1f5f9"
              stroke="#1e293b"
              strokeWidth={R * 0.03}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Highlighted ogive arc */}
            <polyline
              points={polyStr(noseTopSvg)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={R * 0.022}
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* ── Dimension lines ── */}

            {/* OAL — bottom row, widest */}
            {dimArrow(svgBase, svgTip, oalY, `OAL: ${fmtLen(OAL, unit, unit === "mm" ? 2 : 2)}`)}

            {/* BT length */}
            {dimArrow(svgBase, svgBTEnd, dimBelow, `BT: ${fmtLen(boatTailLength, unit)}`)}

            {/* Body length */}
            {bodyLength > 0.02 &&
              dimArrow(svgBTEnd, svgBodyEnd, dimBelow, `Body: ${fmtLen(bodyLength, unit, unit === "mm" ? 1 : 2)}`)}

            {/* Nose length — above */}
            {dimArrow(svgBodyEnd, svgTip, dimAbove, `Nose: ${fmtLen(noseLength, unit)}`, true)}

            {/* Caliber — vertical at shoulder */}
            <g>
              <line
                x1={svgBodyEnd - R * 0.28} y1={-R}
                x2={svgBodyEnd - R * 0.28} y2={R}
                stroke="#94a3b8" strokeWidth={R * 0.014}
                markerStart="url(#aS)" markerEnd="url(#aE)" />
              <text
                x={svgBodyEnd - R * 0.28 - textSize * 0.5} y={0}
                textAnchor="middle" fontSize={textSize}
                fill="#64748b" fontFamily="monospace"
                transform={`rotate(-90, ${svgBodyEnd - R * 0.28 - textSize * 0.5}, 0)`}>
                {`⌀${fmtLen(caliber, unit)}`}
              </text>
            </g>

            {/* BT base diameter — vertical at base */}
            <g>
              <line
                x1={svgBase + R * 0.22} y1={-boatTailR}
                x2={svgBase + R * 0.22} y2={boatTailR}
                stroke="#94a3b8" strokeWidth={R * 0.014}
                markerStart="url(#aS)" markerEnd="url(#aE)" />
              <text
                x={svgBase + R * 0.22 - textSize * 0.5} y={0}
                textAnchor="middle" fontSize={textSize * 0.85}
                fill="#64748b" fontFamily="monospace"
                transform={`rotate(-90, ${svgBase + R * 0.22 - textSize * 0.5}, 0)`}>
                {`⌀${fmtLen(boatTailR * 2, unit)}`}
              </text>
            </g>

            {/* BASE / TIP labels */}
            <text x={svgBase} y={-R - PAD * 0.15} textAnchor="middle"
              fontSize={textSize * 0.8} fill="#94a3b8" fontFamily="sans-serif"
              fontWeight="600" letterSpacing="0.06em">BASE</text>
            <text x={svgTip} y={-R - PAD * 0.15} textAnchor="middle"
              fontSize={textSize * 0.8} fill="#94a3b8" fontFamily="sans-serif"
              fontWeight="600" letterSpacing="0.06em">TIP</text>
          </svg>

          <p className="text-center text-xs text-slate-300 mt-3">
            Dimensions in {unit === "mm" ? "millimetres" : "inches"} · Base on left, tip on right · Cross-section shown
          </p>
        </div>

        {/* ── Ballistic & physical estimates ── */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Estimates</span>
            <span className="text-xs text-slate-300 italic">Assumes lead-copper alloy, 10.8 g/cc density</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="BC G7"
              value={bc.BC_G7.toFixed(3)}
              sub="lb/in² · est."
            />
            <StatCard
              label="BC G1"
              value={bc.BC_G1.toFixed(3)}
              sub="lb/in² · est."
            />
            <StatCard
              label="Form Factor i₇"
              value={bc.i7.toFixed(3)}
              sub="G7 reference"
            />
            <StatCard
              label="Mass"
              value={`${bc.mass_gr.toFixed(1)} gr`}
              sub={`${(bc.mass_gr / 15.432).toFixed(2)} g`}
            />
            <StatCard
              label="Sect. Density"
              value={bc.SD.toFixed(4)}
              sub="lb/in²"
            />
            <StatCard
              label="Volume"
              value={
                unit === "mm"
                  ? `${(bc.volume_in3 * 16387.06).toFixed(1)} mm³`
                  : `${bc.volume_in3.toFixed(4)} in³`
              }
              sub="solid of revolution"
            />
          </div>
        </div>
      </main>
    </div>

