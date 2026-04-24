/**

- geometry.js
- 
- Projectile geometry engine.
- 
- Drop-in replacement for the original four-function module.
- The nose profile is now a C1-continuous hybrid ogive (tangent base +
- secant forward section) rather than a pure tangent ogive, giving a
- ballistically viable nose geometry with controlled meplat and improved BC.
- 
- Public API (unchanged signatures where they existed before):
- computeTangentOgiveRadius(L, caliber)        — back-compat, returns R_T
- computeOgiveY(x, R, rho)                     — back-compat, pure tangent only
- computeNoseProfile(params, segments)          — ★ now hybrid ogive
- computeProjectileOutline(params)              — unchanged signature
- 
- New exports:
- computeNoseGeometry(params)                  — full ballistic metadata,
- ```
                                                no point array generated
  ```
- 
- params object (all lengths mm, angles degrees):
- caliber           {number}  — bore diameter
- nose_length       {number}  — axial length from ogive base to tip
- overall_length    {number}  — total projectile length
- boat_tail_length  {number}  — boat tail axial length
- boat_tail_angle   {number}  — boat tail half-angle (degrees)
- mode              {string}  — optional, default ‘LITZ’
- ```
                              'MILD' | 'LITZ' | 'AGGRESSIVE' | 'EXTREME'
  ```
- customRatio       {number}  — optional, required if mode === ‘EXTREME’ (≥ 2.0)
- coneAngleDeg      {number}  — optional, forcing cone half-angle, default 1.5°
- 
- Manufacturing meplat window: 1.0–1.7mm preferred 1.5mm.
- Warnings are returned in computeNoseGeometry().warnings and surfaced
- on the profile points via the `warnings` field on the last point.
  */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MEPLAT_MIN       = 1.0;   // mm
const MEPLAT_MAX       = 1.7;   // mm
const MEPLAT_PREFERRED = 1.5;   // mm

const DEFAULT_MODE     = “LITZ”;
const DEFAULT_CONE_DEG = 1.5;

/** R_S / R_T ratios per mode */
const MODE_RATIOS = {
MILD:       1.075,
LITZ:       1.2,
AGGRESSIVE: 1.7,
EXTREME:    null,   // must be supplied via params.customRatio
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL GEOMETRY PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** Tangent ogive radius from nose length and calibre. */
function _R_T(L, caliber) {
const R = caliber / 2;
return (L * L + R * R) / (2 * R);
}

/** Radius of projectile body at axial position x on a tangent ogive arc. */
function _tangentY(x, R_T, r) {
return r - (R_T - Math.sqrt(Math.max(0, R_T * R_T - x * x)));
}

/** Surface slope angle (radians) of tangent ogive at x. */
function _tangentAngle(x, R_T) {
return Math.atan2(x, Math.sqrt(Math.max(0, R_T * R_T - x * x)));
}

/** Surface slope angle (radians) of secant ogive at x (arc anchored at tip x=L). */
function _secantAngle(x, L, R_S) {
const dx = L - x;
return Math.atan2(dx, Math.sqrt(Math.max(0, R_S * R_S - dx * dx)));
}

/**

- Radius of projectile body at axial position x on the secant arc.
- Arc anchored at tip (x=L, y=r_tip). Centre is at (L, r_tip + R_S).
- y_S(x) = r_tip + R_S - sqrt(R_S² - (L-x)²)
- (radial value increases as x decreases from L toward x_blend)
  */
  function _secantY(x, L, R_S, r_tip) {
  const dx = L - x;
  return r_tip + R_S - Math.sqrt(Math.max(0, R_S * R_S - dx * dx));
  }

/**

- C1 blend point solver — bisection on f(x) = α_T(x) - α_S(x).
- Returns x_blend (mm) or null if degenerate.
  */
  function _solveBlend(R_T, R_S, L, tol = 1e-9, maxIter = 120) {
  const f   = x => _tangentAngle(x, R_T) - _secantAngle(x, L, R_S);
  const lo0 = 1e-6, hi0 = L - 1e-6;
  if (f(lo0) * f(hi0) > 0) return null;
  let lo = lo0, hi = hi0, mid = (lo + hi) / 2;
  for (let i = 0; i < maxIter; i++) {
  mid = (lo + hi) / 2;
  const fm = f(mid);
  if (Math.abs(fm) < tol || (hi - lo) / 2 < tol) break;
  if (f(lo) * fm < 0) hi = mid; else lo = mid;
  }
  return mid;
  }

/** Resolve R_S/R_T ratio from mode string and optional customRatio. */
function _resolveRatio(mode, customRatio) {
const key = (mode || DEFAULT_MODE).toUpperCase();
if (!(key in MODE_RATIOS)) {
throw new Error(`Unknown ogive mode "${mode}". Use MILD, LITZ, AGGRESSIVE, or EXTREME.`);
}
if (key === “EXTREME”) {
if (customRatio == null || customRatio < 2.0) {
throw new Error(“EXTREME mode requires params.customRatio ≥ 2.0.”);
}
return { key, ratio: customRatio };
}
return { key, ratio: MODE_RATIOS[key] };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE NOSE GEOMETRY SOLVER
// ─────────────────────────────────────────────────────────────────────────────

/**

- Solve the complete hybrid ogive geometry for given params.
- Returns all derived values needed to both sample the profile and
- report ballistic metadata. No point arrays — pure numbers.
- 
- @param {object} params
- @returns {NoseGeometry}
- 
- @typedef {object} NoseGeometry
- @property {string}   modeKey           - Mode used (‘MILD’|‘LITZ’|‘AGGRESSIVE’|‘EXTREME’)
- @property {string}   modeLabel         - Human-readable mode name
- @property {number}   ratio             - R_S / R_T used
- @property {number}   caliber           - Input calibre (mm)
- @property {number}   nose_length       - Input nose length (mm)
- @property {number}   ogiveRatio        - nose_length / caliber (dimensionless)
- @property {number}   R_T               - Tangent ogive radius (mm)
- @property {number}   R_S               - Secant ogive radius (mm)
- @property {number}   x_blend           - Axial blend point from nose base (mm)
- @property {number}   blendFraction     - x_blend / nose_length (0–1)
- @property {number}   r_blend           - Body radius at blend point (mm)
- @property {number}   r_tip             - Computed meplat radius (mm)
- @property {number}   tipSlopeDeg       - Surface slope at tip junction (degrees) — ideally < 5°
- @property {number}   x_contact         - Forcing cone contact point (mm from base)
- @property {number}   contactAngleDeg   - Ogive slope at contact (≈ coneAngleDeg)
- @property {string}   meplat_status     - ‘ok’|‘in_range’|‘below_min’|‘above_max’|‘error’
- @property {boolean}  valid             - Geometry is physically realisable
- @property {string[]} warnings          - Human-readable warnings for UI display
  */
  function _solveNoseGeometry(params) {
  const warnings = [];

const L            = params.nose_length;
const d            = params.caliber;
const coneAngleDeg = params.coneAngleDeg ?? DEFAULT_CONE_DEG;
const r            = d / 2;
const θ            = (coneAngleDeg * Math.PI) / 180;

const { key: modeKey, ratio } = _resolveRatio(params.mode, params.customRatio);

const modeLabels = {
MILD: “Mild Hybrid”, LITZ: “Litz Hybrid”,
AGGRESSIVE: “Aggressive Hybrid”, EXTREME: “Extreme Hybrid”,
};

// ── R_T and R_S ──────────────────────────────────────────────────────────
const R_T = (L * L + r * r) / (2 * r);
const R_S = ratio * R_T;

// ── C1 blend point ────────────────────────────────────────────────────────
const x_blend = _solveBlend(R_T, R_S, L);

if (x_blend === null) {
return {
modeKey, modeLabel: modeLabels[modeKey], ratio, caliber: d,
nose_length: L, ogiveRatio: L / d,
R_T, R_S,
x_blend: null, blendFraction: null, r_blend: null,
r_tip: null, tipSlopeDeg: null,
x_contact: null, contactAngleDeg: null,
meplat_status: “error”, valid: false,
warnings: [“C1 blend solver failed — ogive geometry degenerate for these inputs.”],
};
}

const blendFraction = x_blend / L;
const r_blend       = _tangentY(x_blend, R_T, r);

// ── Meplat (computed result) ──────────────────────────────────────────────
const dx_blend = L - x_blend;
const r_tip    = r_blend - R_S + Math.sqrt(Math.max(0, R_S * R_S - dx_blend * dx_blend));

// ── Tip slope — surface angle where secant section meets meplat face ──────
// α_tip = secant arc slope at x = L
// At x=L: dx=0, so _secantAngle → 0 by definition (arc tangent to axis at tip).
// The actual tip slope is evaluated just inside the tip at x = L - ε:
const ε          = 1e-4;
const tipSlopeRad = _secantAngle(L - ε, L, R_S);
const tipSlopeDeg = (tipSlopeRad * 180) / Math.PI;

// ── Forcing cone contact ──────────────────────────────────────────────────
const x_contact      = R_T * Math.sin(θ);
const contactAngleDeg = (Math.asin(Math.min(x_contact / R_T, 1)) * 180) / Math.PI;

// ── Meplat status ─────────────────────────────────────────────────────────
let meplat_status;
if      (r_tip < MEPLAT_MIN - 1e-4)                           meplat_status = “below_min”;
else if (r_tip > MEPLAT_MAX + 1e-4)                           meplat_status = “above_max”;
else if (Math.abs(r_tip - MEPLAT_PREFERRED) <= 0.05)          meplat_status = “ok”;
else                                                           meplat_status = “in_range”;

// ── Warnings ──────────────────────────────────────────────────────────────

if (meplat_status === “below_min”) {
warnings.push(
`Meplat ${r_tip.toFixed(4)} mm is below manufacturing minimum (${MEPLAT_MIN} mm). ` +
`Increase nose_length or use a lower ratio mode.`
);
} else if (meplat_status === “above_max”) {
warnings.push(
`Meplat ${r_tip.toFixed(4)} mm exceeds manufacturing maximum (${MEPLAT_MAX} mm). ` +
`Decrease nose_length or use a higher ratio mode.`
);
} else if (meplat_status === “in_range”) {
warnings.push(
`Meplat ${r_tip.toFixed(4)} mm within limits but ` +
`${Math.abs(r_tip - MEPLAT_PREFERRED).toFixed(4)} mm from preferred ${MEPLAT_PREFERRED} mm.`
);
}

// Tip slope — flag if kink at meplat junction is significant
if (tipSlopeDeg > 8) {
warnings.push(
`Tip slope ${tipSlopeDeg.toFixed(2)}° is high — ogive arrives at meplat at a steep angle. ` +
`This creates a stress concentration at the tip junction and may affect drag. ` +
`Increase nose_length or reduce ratio to flatten the tip approach.`
);
} else if (tipSlopeDeg > 5) {
warnings.push(
`Tip slope ${tipSlopeDeg.toFixed(2)}° is moderate — acceptable but worth monitoring ` +
`for tip forming quality.`
);
}

// Forcing cone contact must fall within tangent section (before blend)
if (x_contact > x_blend) {
warnings.push(
`Forcing cone contact (${x_contact.toFixed(3)} mm) falls beyond the blend point ` +
`(${x_blend.toFixed(3)} mm) — cone contacts the secant section rather than the tangent ` +
`section. Reduce nose_length or use a milder mode.`
);
}
if (x_contact > L) {
warnings.push(
`Forcing cone contact (${x_contact.toFixed(3)} mm) exceeds nose length — invalid geometry.`
);
}

// Tangent section length — must comfortably contain forcing cone contact
const tangentSectionLength = x_blend;
const contactMargin        = x_blend - x_contact;
if (contactMargin < 1.0 && x_contact <= x_blend) {
warnings.push(
`Tangent section margin above forcing cone contact is only ${contactMargin.toFixed(3)} mm. ` +
`A minimum of 1.0 mm is recommended for reliable cone engagement.`
);
}

// Ogive ratio advisories
const ogiveRatio = L / d;
if (ogiveRatio < 1.5) warnings.push(`Ogive ratio ${ogiveRatio.toFixed(2)} cal is very short — consider increasing nose_length.`);
if (ogiveRatio > 4.5) warnings.push(`Ogive ratio ${ogiveRatio.toFixed(2)} cal is very long — verify static stability margin.`);

// Blend fraction advisory — tangent section too short for AGGRESSIVE/EXTREME
if (blendFraction > 0.65) {
warnings.push(
`Blend point is at ${(blendFraction * 100).toFixed(1)}% of nose length — tangent section is ` +
`short relative to total ogive. Forcing cone engagement reliability may be reduced.`
);
}

if (modeKey === “EXTREME” && ratio > 4.0) {
warnings.push(`Extreme ratio ${ratio.toFixed(3)} is very high — verify meplat and tip geometry carefully.`);
}

const valid = x_contact <= L && r_tip > 0 && x_blend !== null;

return {
modeKey,
modeLabel:       modeLabels[modeKey],
ratio:           parseFloat(ratio.toFixed(4)),
caliber:         d,
nose_length:     L,
ogiveRatio:      parseFloat((L / d).toFixed(4)),
R_T:             parseFloat(R_T.toFixed(4)),
R_S:             parseFloat(R_S.toFixed(4)),
x_blend:         parseFloat(x_blend.toFixed(4)),
blendFraction:   parseFloat(blendFraction.toFixed(4)),
r_blend:         parseFloat(r_blend.toFixed(4)),
r_tip:           parseFloat(r_tip.toFixed(4)),
tipSlopeDeg:     parseFloat(tipSlopeDeg.toFixed(4)),
x_contact:       parseFloat(x_contact.toFixed(4)),
contactAngleDeg: parseFloat(contactAngleDeg.toFixed(4)),
meplat_status,
valid,
warnings,
};
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SAMPLER
// ─────────────────────────────────────────────────────────────────────────────

/**

- Sample the hybrid ogive profile at axial position x.
- Returns the body radius (y) at that position.
- 
- Uses the tangent arc for x ≤ x_blend, secant arc for x > x_blend.
- Clamps to [0, r] for safety.
- 
- @param {number} x        - Axial position from nose base (mm)
- @param {object} geo      - Result from _solveNoseGeometry()
- @returns {number}        - Body radius at x (mm)
  */
  function _sampleHybridY(x, geo) {
  const { R_T, R_S, x_blend, r_blend, r_tip, nose_length } = geo;
  const r = geo.caliber / 2;

if (x <= 0)            return 0;
if (x >= nose_length)  return r_tip > 0 ? r_tip : 0;

if (x <= x_blend) {
// Tangent section
return _tangentY(x, R_T, r);
} else {
// Secant section
return _secantY(x, nose_length, R_S, r_tip);
}
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**

- Back-compat export. Returns the tangent ogive radius R_T for given
- nose length and calibre. Unchanged from original.
- 
- @param {number} L       - Nose length (mm)
- @param {number} caliber - Calibre (mm)
- @returns {number}
  */
  export function computeTangentOgiveRadius(L, caliber) {
  return _R_T(L, caliber);
  }

/**

- Back-compat export. Samples a pure tangent ogive profile at position x.
- Used only if a caller needs the original tangent-only behaviour.
- For the hybrid profile, use computeNoseProfile() or _sampleHybridY().
- 
- @param {number} x    - Axial position (mm)
- @param {number} R    - Projectile radius (caliber/2, mm)
- @param {number} rho  - Tangent ogive radius R_T (mm)
- @returns {number}    - Body radius at x (mm)
  */
  export function computeOgiveY(x, R, rho) {
  const cx   = Math.sqrt(Math.max(rho * rho - (rho - R) ** 2, 0));
  if (x <= 0) return 0;
  const disc = rho * rho - (x - cx) * (x - cx);
  if (disc < 0) return 0;
  return Math.max(Math.sqrt(disc) - (rho - R), 0);
  }

/**

- Compute the nose profile as an array of {x, y} points.
- 
- The profile is a C1-continuous hybrid ogive:
- x = 0                → y = 0    (nose base, joins bearing surface)
- x ∈ (0, x_blend)     → tangent ogive arc (slope-continuous with bore axis)
- x ∈ (x_blend, L)     → secant ogive arc  (C1 join at x_blend)
- x = L                → y = r_tip (meplat face)
- 
- The last point also carries a `geometry` property with the full
- NoseGeometry metadata so callers can read warnings and stats without
- calling computeNoseGeometry() separately.
- 
- @param {object} params   - See module header for fields.
- @param {number} [segments=120]  - Number of sample intervals (points = segments+1).
- @returns {{ x: number, y: number }[]}
  */
  export function computeNoseProfile(params, segments = 120) {
  const geo = _solveNoseGeometry(params);
  const L   = params.nose_length;
  const pts = [];

for (let i = 0; i <= segments; i++) {
const x = (i / segments) * L;
pts.push({ x, y: _sampleHybridY(x, geo) });
}

// Guarantee exact tip point
const last = pts[pts.length - 1];
if (Math.abs(last.x - L) > 1e-9 || Math.abs(last.y - geo.r_tip) > 1e-6) {
pts.push({ x: L, y: Math.max(geo.r_tip, 0) });
}

// Attach geometry metadata to last point for convenient access
pts[pts.length - 1].geometry = geo;

return pts;
}

/**

- Compute ballistic nose geometry metadata without generating a point array.
- 
- Use this to populate UI stats panels, show warnings, and verify the
- design before rendering the outline.
- 
- @param {object} params   - See module header for fields.
- @returns {NoseGeometry}  - Full geometry metadata (see typedef above).
- 
- @example
- const geo = computeNoseGeometry({ caliber: 7.83, nose_length: 25, mode: ‘LITZ’ });
- console.log(geo.R_T, geo.R_S, geo.r_tip, geo.warnings);
  */
  export function computeNoseGeometry(params) {
  return _solveNoseGeometry(params);
  }

/**

- Compute the full projectile outline as a closed polygon of {x, y} points.
- 
- Outline runs:
- nose profile (hybrid ogive, upper half) →
- cylindrical body →
- boat tail taper →
- base centre point →
- lower half (mirrored) back to start
- 
- Signature and return shape are unchanged from the original.
- 
- @param {object} params   - See module header for fields.
- @returns {{ x: number, y: number }[]}
  */
  export function computeProjectileOutline(params) {
  const R    = params.caliber / 2;
  const raw  = R - params.boat_tail_length * Math.tan(params.boat_tail_angle * Math.PI / 180);
  const btR  = Math.max(raw, 0.005);
  const body = Math.max(params.overall_length - params.nose_length - params.boat_tail_length, 0);

// ── Upper half ────────────────────────────────────────────────────────────
const upper = […computeNoseProfile(params)];

// Cylindrical body section
if (body > 0) {
upper.push({ x: params.nose_length + body, y: R });
}

// Boat tail taper
for (let i = 1; i <= 30; i++) {
const t = i / 30;
upper.push({
x: params.nose_length + body + t * params.boat_tail_length,
y: R + t * (btR - R),
});
}

// Base centre
upper.push({ x: params.overall_length, y: 0 });

// ── Lower half (mirror, omit base point to avoid duplication) ─────────────
const lower = upper.slice(0, -1).reverse().map(p => ({ x: p.x, y: -p.y }));

return […upper, …lower];
}