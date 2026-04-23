export const MM_PER_INCH   = 25.4;
export const GRAINS_PER_G  = 15.4324;
export const CC_PER_IN3    = 16.3871;

// The length input field IDs that require conversion
export const LENGTH_FIELDS = ["caliber", "overall_length", "nose_length", "boat_tail_length"];

// Step sizes for number inputs per mode
export const INPUT_STEPS = {
    imperial: { caliber: "0.001", overall_length: "0.001", nose_length: "0.001", boat_tail_length: "0.001" },
    metric:   { caliber: "0.01",  overall_length: "0.1",   nose_length: "0.1",   boat_tail_length: "0.1"  }
};

// Unit label strings for display
export const UNIT_LABELS = {
    imperial: { length: "in", mass: "gr", volume: "in³", com: "in" },
    metric:   { length: "mm", mass:  "g", volume: "cm³", com: "mm" }
};

/**
 * Convert raw UI input values (in the selected display unit) to imperial
 * for consumption by physics modules.  Non-length fields are passed through.
 */
export function toPhysicsParams(raw, mode) {
    if (mode === "imperial") return { ...raw };
    const out = { ...raw };
    for (const k of LENGTH_FIELDS) {
        if (raw[k] != null) out[k] = raw[k] / MM_PER_INCH;
    }
    return out;
}

/**
 * Convert stored imperial params to the display unit so inputs can be
 * re-populated after a unit toggle.  Non-length fields are passed through.
 */
export function toDisplayParams(paramsIn, mode) {
    if (mode === "imperial") return { ...paramsIn };
    const out = { ...paramsIn };
    for (const k of LENGTH_FIELDS) {
        if (paramsIn[k] != null) out[k] = +(paramsIn[k] * MM_PER_INCH).toFixed(3);
    }
    return out;
}

/**
 * Build a display-friendly result object for the JSON output panel.
 * The physics result (always imperial) is reformatted into the chosen unit.
 * The raw SVG-render points are excluded — they are internal rendering data.
 */
export function formatResultForDisplay(result, mode) {
    const b = result.ballistics;
    const g = result.geometry;
    const s = result.stability;
    const lbl = UNIT_LABELS[mode];

    if (mode === "imperial") {
        return {
            _units: { length: lbl.length, mass: lbl.mass, volume: lbl.volume },
            geometry: {
                caliber:          g.caliber,
                overall_length:   g.overall_length,
                nose_length:      g.nose_length,
                boat_tail_length: g.boat_tail_length,
                boat_tail_angle:  g.boat_tail_angle,
                ogive_type:       g.ogive_type,
                material:         g.material,
                density_gcc:      g.density_gcc
            },
            ballistics: {
                volume_in3: b.volume_in3,
                mass_gr:    b.mass_gr,
                sd:         b.sd,
                bc_g7:      b.bc_g7,
                bc_g1:      b.bc_g1
            },
            stability: {
                center_of_mass_in: s.center_of_mass
            }
        };
    }

    // Metric
    return {
        _units: { length: lbl.length, mass: lbl.mass, volume: lbl.volume },
        geometry: {
            caliber:          +(g.caliber          * MM_PER_INCH).toFixed(3),
            overall_length:   +(g.overall_length   * MM_PER_INCH).toFixed(3),
            nose_length:      +(g.nose_length       * MM_PER_INCH).toFixed(3),
            boat_tail_length: +(g.boat_tail_length  * MM_PER_INCH).toFixed(3),
            boat_tail_angle:  g.boat_tail_angle,
            ogive_type:       g.ogive_type,
            material:         g.material,
            density_gcc:      g.density_gcc
        },
        ballistics: {
            volume_cm3: +(b.volume_in3 * CC_PER_IN3).toFixed(4),
            mass_g:     +(b.mass_gr    / GRAINS_PER_G).toFixed(4),
            sd:         b.sd,
            bc_g7:      b.bc_g7,
            bc_g1:      b.bc_g1
        },
        stability: {
            center_of_mass_mm: +(s.center_of_mass * MM_PER_INCH).toFixed(3)
        }
    };
}

