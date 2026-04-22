export type OgiveType = "tangent" | "secant" | "hybrid";

export interface ProjectileParams {
  caliber: number;        // inches
  overallLength: number;  // inches
  noseLength: number;     // inches
  boatTailLength: number; // inches
  boatTailAngle: number;  // degrees
  ogiveType: OgiveType;
}

export interface Point {
  x: number;
  y: number;
}

export interface BallisticEstimate {
  volume_in3: number;    // cubic inches (solid of revolution)
  mass_gr: number;       // grains (assuming 10.8 g/cc density)
  SD: number;            // sectional density (lb/in²)
  i7: number;            // G7 form factor estimate
  BC_G7: number;         // G7 ballistic coefficient
  BC_G1: number;         // G1 ballistic coefficient (approximate)
}

// ---------------------------------------------------------------------------
// Ogive radius helpers
// ---------------------------------------------------------------------------

/**
 * Tangent ogive radius.  ρ = (L² + R²) / (2R)
 */
export function computeTangentOgiveRadius(noseLength: number, caliber: number): number {
  const R = caliber / 2;
  const L = noseLength;
  return (L * L + R * R) / (2 * R);
}

function getOgiveRadius(params: ProjectileParams): number {
  // ogiveRho is always 1.0 (tangent radius) for all types.
  // Secant/hybrid differ in HOW the arc is applied, not by a different radius here.
  // For secant: use 1.0× tangent (standard baseline secant = same radius, sharper shoulder).
  // For hybrid: blend halfway — in practice at rhoFactor=1 this equals tangent.
  return computeTangentOgiveRadius(params.noseLength, params.caliber);
}

// ---------------------------------------------------------------------------
// Ogive profile geometry (see comments in previous version for derivation)
// ---------------------------------------------------------------------------
//
// Circle centre at (cx, −(ρ−R)), profile: y(x) = √(ρ² − (x−cx)²) − (ρ−R)
// cx = √(2ρR − R²)   →  y(0) = 0 for any ρ.

function computeOgiveY(x: number, R: number, rho: number): number {
  const cx = Math.sqrt(Math.max(rho * rho - (rho - R) * (rho - R), 0));
  if (x <= 0) return 0;
  const disc = rho * rho - (x - cx) * (x - cx);
  if (disc < 0) return 0;
  return Math.max(Math.sqrt(disc) - (rho - R), 0);
}

/**
 * Upper-half nose profile, x: 0 (tip) → noseLength (shoulder), y: 0 → R.
 */
export function computeNoseProfile(params: ProjectileParams, segments = 120): Point[] {
  const { caliber, noseLength } = params;
  const R = caliber / 2;
  const rho = getOgiveRadius(params);
  const L = noseLength;

  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * L;
    const y = computeOgiveY(x, R, rho);
    pts.push({ x, y });
  }

  const last = pts[pts.length - 1];
  if (Math.abs(last.y - R) > 1e-6) {
    pts.push({ x: L, y: R });
  }

  return pts;
}

// ---------------------------------------------------------------------------
// Full outline polygon
// ---------------------------------------------------------------------------

export function computeProjectileOutline(params: ProjectileParams): Point[] {
  const { caliber, overallLength, noseLength, boatTailLength, boatTailAngle } = params;
  const R = caliber / 2;
  const rawBTR = R - boatTailLength * Math.tan((boatTailAngle * Math.PI) / 180);
  const boatTailR = Math.max(rawBTR, 0.005);
  const bodyLength = Math.max(overallLength - noseLength - boatTailLength, 0);

  const noseTop = computeNoseProfile(params);
  const upper: Point[] = [...noseTop];

  if (bodyLength > 0) {
    upper.push({ x: noseLength + bodyLength, y: R });
  }

  const BT_SEGS = 30;
  for (let i = 1; i <= BT_SEGS; i++) {
    const t = i / BT_SEGS;
    upper.push({
      x: noseLength + bodyLength + t * boatTailLength,
      y: R + t * (boatTailR - R),
    });
  }

  upper.push({ x: overallLength, y: 0 });

  const lower: Point[] = upper
    .slice(0, upper.length - 1)
    .reverse()
    .map(p => ({ x: p.x, y: -p.y }));

  return [...upper, ...lower];
}

export function computeNoseOutline(params: ProjectileParams): Point[] {
  return computeNoseProfile(params);
}

// ---------------------------------------------------------------------------
// Volume of solid of revolution  (Pappus / disk method)
// V = π ∫ r(x)² dx  integrated numerically over [0, OAL]
// ---------------------------------------------------------------------------

export function computeVolume(params: ProjectileParams): number {
  const { caliber, overallLength, noseLength, boatTailLength, boatTailAngle } = params;
  const R = caliber / 2;
  const rawBTR = R - boatTailLength * Math.tan((boatTailAngle * Math.PI) / 180);
  const boatTailR = Math.max(rawBTR, 0.005);
  const bodyLength = Math.max(overallLength - noseLength - boatTailLength, 0);
  const rho = getOgiveRadius(params);

  const N = 1000;
  const dx = overallLength / N;
  let sum = 0;

  for (let i = 0; i <= N; i++) {
    const x = i * dx;
    let r: number;

    if (x <= noseLength) {
      // Nose section (x=0 is tip)
      r = computeOgiveY(x, R, rho);
    } else if (x <= noseLength + bodyLength) {
      // Cylindrical body
      r = R;
    } else {
      // Boat tail — taper from R down to boatTailR
      const t = (x - noseLength - bodyLength) / boatTailLength;
      r = R + t * (boatTailR - R);
    }

    // Trapezoidal weights
    const w = (i === 0 || i === N) ? 0.5 : 1.0;
    sum += w * r * r;
  }

  return Math.PI * sum * dx;
}

// ---------------------------------------------------------------------------
// Ballistic coefficient estimation
//
// Method:
//  1.  Mass from volume × density (lead-copper, 10.8 g/cc).
//  2.  Sectional density SD = mass_lb / caliber².
//  3.  G7 form factor i7 from empirical correction:
//       - Base i7 from ogive type (secant = slightly better).
//       - Nose fineness correction: LR = L_nose/D.  Each cal above 3.0 → −0.015.
//       - BT angle correction:  each deg above 7° → −0.006 (diminishing returns).
//       - BT length correction: each 0.1 cal BT above 0.5 cal → −0.005.
//  4.  G1 ≈ G7 / 0.47  (empirical ratio for typical Spitzer BTHP at moderate velocity).
//
// This is a first-order approximation, ±10–15% vs measured values.
// ---------------------------------------------------------------------------

export function computeBallisticEstimate(params: ProjectileParams): BallisticEstimate {
  const { caliber, noseLength, boatTailLength, boatTailAngle, ogiveType } = params;
  const D = caliber;
  const R = D / 2;

  // Volume → mass
  const volume_in3 = computeVolume(params);
  const volume_cc = volume_in3 * 16.3871;         // 1 in³ = 16.387 cm³
  const density_g_per_cc = 10.8;                  // lead-copper mix
  const mass_g = volume_cc * density_g_per_cc;
  const mass_gr = mass_g * 15.4324;               // grains
  const mass_lb = mass_gr / 7000;

  // Sectional density (lb/in²)
  const A = Math.PI * R * R;
  const SD = mass_lb / (D * D);

  // Form factor i7
  const LR = noseLength / D;                      // nose length in calibers
  const BTA = boatTailAngle;                      // degrees
  const BTL = boatTailLength / D;                 // BT length in calibers

  const baseI7: Record<OgiveType, number> = {
    tangent: 1.03,
    secant:  0.96,
    hybrid:  0.99,
  };

  const noseFineAdj = -0.015 * (LR - 3.0);       // ref at 3 cal nose
  const btAngleAdj  = -0.006 * (BTA - 7.0);       // ref at 7°
  const btLenAdj    = -0.005 * (BTL - 0.5) / 0.1; // ref at 0.5 cal BT

  const i7 = Math.max(0.70, Math.min(1.40,
    baseI7[ogiveType] + noseFineAdj + btAngleAdj + btLenAdj
  ));

  const BC_G7 = SD / i7;
  const BC_G1 = BC_G7 / 0.47;  // rough empirical G7→G1 conversion for Spitzer BTHP

  return { volume_in3, mass_gr, SD, i7, BC_G7, BC_G1 };
}

export function getDefaultParams(): ProjectileParams {
  return {
    caliber: 0.308,
    overallLength: 1.2,
    noseLength: 0.45,
    boatTailLength: 0.18,
    boatTailAngle: 9,
    ogiveType: "tangent",
  };
}
