/**
 * geometry.js (v0.4.0) — Native JS, no ES modules.
 * Exposed on window.OgiveGeometry
 */
(function (global) {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────────
  var MEPLAT_MIN        = 1.0;
  var MEPLAT_MAX        = 1.7;
  var MEPLAT_PREFERRED  = 1.5;

  var DEFAULT_MODE           = "LITZ";
  var DEFAULT_CONE_DEG       = 1.5;
  var DEFAULT_BLEND_FRACTION = 0.55;

  var MODE_RATIOS = {
    MILD:       1.075,
    LITZ:       1.2,
    AGGRESSIVE: 1.7,
    EXTREME:    null,
  };

  var MODE_LABELS = {
    MILD:       "Mild Hybrid",
    LITZ:       "Litz Hybrid",
    AGGRESSIVE: "Aggressive Hybrid",
    EXTREME:    "Extreme Hybrid",
  };

  // ── Internal primitives ────────────────────────────────────────────────────
  function _tangentY(x, R_T, r) {
    return r - (R_T - Math.sqrt(Math.max(0, R_T * R_T - x * x)));
  }

  function _secantYFromCenter(x, Cx, Cy, R_S) {
    var dx = x - Cx;
    return Cy + Math.sqrt(Math.max(0, R_S * R_S - dx * dx));
  }

  function _secantSlopeFromCenter(x, Cx, Cy, R_S) {
    var dx    = x - Cx;
    var denom = Math.sqrt(Math.max(1e-18, R_S * R_S - dx * dx));
    return -dx / denom;
  }

  function _resolveRatio(mode, customRatio) {
    var key = (mode || DEFAULT_MODE).toUpperCase();
    if (!(key in MODE_RATIOS)) {
      throw new Error('Unknown ogive mode "' + mode + '". Use MILD, LITZ, AGGRESSIVE, or EXTREME.');
    }
    if (key === "EXTREME") {
      if (customRatio == null || customRatio < 2.0) {
        throw new Error("EXTREME mode requires customRatio >= 2.0.");
      }
      return { key: key, ratio: customRatio };
    }
    return { key: key, ratio: MODE_RATIOS[key] };
  }

  // ── Core solver ────────────────────────────────────────────────────────────
  function computeNoseGeometry(params) {
    var warnings = [];
    var L            = params.nose_length;
    var d            = params.caliber;
    var coneAngleDeg = params.coneAngleDeg != null ? params.coneAngleDeg : DEFAULT_CONE_DEG;
    var r            = d / 2;
    var theta        = (coneAngleDeg * Math.PI) / 180;

    var resolved = _resolveRatio(params.mode, params.customRatio);
    var modeKey  = resolved.key;
    var ratio    = resolved.ratio;

    var R_T   = (L * L + r * r) / (2 * r);
    var R_S   = ratio * R_T;
    var C_T_x = 0;
    var C_T_y = r - R_T;

    var blendFractionFromTip = Math.min(
      Math.max(params.blendFraction != null ? params.blendFraction : DEFAULT_BLEND_FRACTION, 0.05),
      0.95
    );
    var x_blend = L * (1 - blendFractionFromTip);
    var r_blend = _tangentY(x_blend, R_T, r);

    var dToCT_x = C_T_x - x_blend;
    var dToCT_y = C_T_y - r_blend;
    var C_S_x   = x_blend + (R_S / R_T) * dToCT_x;
    var C_S_y   = r_blend + (R_S / R_T) * dToCT_y;

    var dxTip    = L - C_S_x;
    var sqArgTip = R_S * R_S - dxTip * dxTip;
    var r_tip    = sqArgTip >= 0 ? C_S_y + Math.sqrt(sqArgTip) : NaN;

    if (!isFinite(r_tip)) {
      return {
        modeKey: modeKey, modeLabel: MODE_LABELS[modeKey], ratio: ratio,
        caliber: d, nose_length: L, ogiveRatio: L / d,
        R_T: R_T, R_S: R_S,
        x_blend: +x_blend.toFixed(6), blendFraction: +blendFractionFromTip.toFixed(4),
        r_blend: +r_blend.toFixed(6), r_tip: null, r_tip_mm: null, tipSlopeDeg: null,
        x_contact: null, contactAngleDeg: null,
        C_T_x: C_T_x, C_T_y: C_T_y, C_S_x: null, C_S_y: null,
        meplat_status: "error", valid: false,
        warnings: ["Secant arc does not reach the tip. Reduce blendFraction or use a higher ratio."],
      };
    }

    var tipSlopeRad    = Math.atan(Math.abs(_secantSlopeFromCenter(L, C_S_x, C_S_y, R_S)));
    var tipSlopeDeg    = (tipSlopeRad * 180) / Math.PI;
    var x_contact      = R_T * Math.sin(theta);
    var contactAngleDeg = (Math.asin(Math.min(x_contact / R_T, 1)) * 180) / Math.PI;

    var toMm     = d > 5 ? 1 : 25.4;
    var r_tip_mm = r_tip * toMm;

    var meplat_status;
    if      (r_tip_mm < MEPLAT_MIN - 1e-4)                    meplat_status = "below_min";
    else if (r_tip_mm > MEPLAT_MAX + 1e-4)                    meplat_status = "above_max";
    else if (Math.abs(r_tip_mm - MEPLAT_PREFERRED) <= 0.05)   meplat_status = "ok";
    else                                                       meplat_status = "in_range";

    if (meplat_status === "below_min") {
      warnings.push("Meplat " + r_tip_mm.toFixed(3) + " mm is below manufacturing minimum (" + MEPLAT_MIN + " mm).");
    } else if (meplat_status === "above_max") {
      warnings.push("Meplat " + r_tip_mm.toFixed(3) + " mm exceeds manufacturing maximum (" + MEPLAT_MAX + " mm).");
    } else if (meplat_status === "in_range") {
      warnings.push("Meplat " + r_tip_mm.toFixed(3) + " mm within limits but " + Math.abs(r_tip_mm - MEPLAT_PREFERRED).toFixed(3) + " mm from preferred " + MEPLAT_PREFERRED + " mm.");
    }

    if (tipSlopeDeg > 8) {
      warnings.push("Tip slope " + tipSlopeDeg.toFixed(2) + "\u00b0 is high \u2014 steep angle at meplat junction.");
    } else if (tipSlopeDeg > 5) {
      warnings.push("Tip slope " + tipSlopeDeg.toFixed(2) + "\u00b0 is moderate.");
    }

    if (x_contact > x_blend) {
      warnings.push("Forcing cone contact (" + (x_contact * toMm).toFixed(3) + " mm) beyond blend point \u2014 cone contacts secant section.");
    }
    if (x_contact > L) {
      warnings.push("Forcing cone contact exceeds nose length \u2014 invalid geometry.");
    }

    var contactMargin = x_blend - x_contact;
    if (contactMargin < (1 / toMm) && x_contact <= x_blend) {
      warnings.push("Tangent section margin above cone contact is only " + (contactMargin * toMm).toFixed(3) + " mm.");
    }

    var ogiveRatio = L / d;
    if (ogiveRatio < 1.5) warnings.push("Ogive ratio " + ogiveRatio.toFixed(2) + " cal is very short.");
    if (ogiveRatio > 4.5) warnings.push("Ogive ratio " + ogiveRatio.toFixed(2) + " cal is very long \u2014 verify stability.");
    if (blendFractionFromTip > 0.65) {
      warnings.push("Blend is " + (blendFractionFromTip * 100).toFixed(0) + "% from tip \u2014 tangent section is short.");
    }
    if (modeKey === "EXTREME" && ratio > 4.0) {
      warnings.push("Extreme ratio " + ratio.toFixed(3) + " is very high \u2014 verify meplat carefully.");
    }

    return {
      modeKey:         modeKey,
      modeLabel:       MODE_LABELS[modeKey],
      ratio:           +ratio.toFixed(4),
      caliber:         d,
      nose_length:     L,
      ogiveRatio:      +(L / d).toFixed(4),
      R_T:             +R_T.toFixed(6),
      R_S:             +R_S.toFixed(6),
      x_blend:         +x_blend.toFixed(6),
      blendFraction:   +blendFractionFromTip.toFixed(4),
      r_blend:         +r_blend.toFixed(6),
      r_tip:           +r_tip.toFixed(6),
      r_tip_mm:        +r_tip_mm.toFixed(4),
      tipSlopeDeg:     +tipSlopeDeg.toFixed(4),
      x_contact:       +x_contact.toFixed(6),
      contactAngleDeg: +contactAngleDeg.toFixed(4),
      C_T_x:           +C_T_x.toFixed(6),
      C_T_y:           +C_T_y.toFixed(6),
      C_S_x:           +C_S_x.toFixed(6),
      C_S_y:           +C_S_y.toFixed(6),
      meplat_status:   meplat_status,
      valid:           x_contact <= L && r_tip > 0,
      warnings:        warnings,
    };
  }

  // ── Hybrid-aware nose sampler ──────────────────────────────────────────────
  function sampleNoseY(x, params, geo) {
    var g = geo || computeNoseGeometry(params);
    var r = params.caliber / 2;
    if (g.r_tip === null || g.C_S_x === null) return 0;
    if (x <= 0)             return r;
    if (x >= g.nose_length) return Math.max(g.r_tip, 0);
    if (x <= g.x_blend) {
      return _tangentY(x, g.R_T, r);
    } else {
      return _secantYFromCenter(x, g.C_S_x, g.C_S_y, g.R_S);
    }
  }

  // ── Back-compat exports ────────────────────────────────────────────────────
  function computeTangentOgiveRadius(L, caliber) {
    var R = caliber / 2;
    return (L * L + R * R) / (2 * R);
  }

  function computeOgiveY(x, R, rho) {
    var cx   = Math.sqrt(Math.max(rho * rho - Math.pow(rho - R, 2), 0));
    if (x <= 0) return 0;
    var disc = rho * rho - Math.pow(x - cx, 2);
    if (disc < 0) return 0;
    return Math.max(Math.sqrt(disc) - (rho - R), 0);
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  function computeNoseProfile(params, segments) {
    segments = segments || 240;
    var geo  = computeNoseGeometry(params);
    var L    = params.nose_length;
    var pts  = [];

    for (var i = 0; i <= segments; i++) {
      var x = (i / segments) * L;
      pts.push({ x: x, y: sampleNoseY(x, params, geo) });
    }

    var last  = pts[pts.length - 1];
    var r_tip = geo.r_tip != null ? geo.r_tip : 0;
    if (Math.abs(last.x - L) > 1e-9 || Math.abs(last.y - r_tip) > 1e-6) {
      pts.push({ x: L, y: Math.max(r_tip, 0) });
    }

    if (geo.x_blend !== null && geo.r_blend !== null) {
      pts.blendPoint = { x: geo.x_blend, y: geo.r_blend };
    }
    pts.geometry = geo;
    return pts;
  }

  // ── Outline ────────────────────────────────────────────────────────────────
  function computeProjectileOutline(params) {
    var R    = params.caliber / 2;
    var raw  = R - params.boat_tail_length * Math.tan(params.boat_tail_angle * Math.PI / 180);
    var btR  = Math.max(raw, 0.005);
    var body = Math.max(params.overall_length - params.nose_length - params.boat_tail_length, 0);

    var noseProfile = computeNoseProfile(params);
    var geo         = noseProfile.geometry;

    var upper = noseProfile.slice().reverse().map(function (p) {
      return { x: params.nose_length - p.x, y: p.y };
    });

    if (body > 0) {
      upper.push({ x: params.nose_length + body, y: R });
    }

    for (var i = 1; i <= 30; i++) {
      var t = i / 30;
      upper.push({
        x: params.nose_length + body + t * params.boat_tail_length,
        y: R + t * (btR - R),
      });
    }

    upper.push({ x: params.overall_length, y: 0 });

    var lower   = upper.slice(0, upper.length - 1).reverse().map(function (p) {
      return { x: p.x, y: -p.y };
    });
    var outline = upper.concat(lower);

    outline.geometry = geo;

    if (geo.x_blend !== null && geo.r_blend !== null) {
      outline.blendPoint = {
        x: params.nose_length - geo.x_blend,
        y: geo.r_blend,
      };
    }

    return outline;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  global.OgiveGeometry = {
    MODE_RATIOS:                MODE_RATIOS,
    MODE_LABELS:                MODE_LABELS,
    computeNoseGeometry:        computeNoseGeometry,
    sampleNoseY:                sampleNoseY,
    computeTangentOgiveRadius:  computeTangentOgiveRadius,
    computeOgiveY:              computeOgiveY,
    computeNoseProfile:         computeNoseProfile,
    computeProjectileOutline:   computeProjectileOutline,
  };

}(window));
