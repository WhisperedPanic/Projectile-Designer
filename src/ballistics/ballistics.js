//---ballistics---

import { computeOgiveY, computeTangentOgiveRadius } from "../geometry/geometry.js";

export function computeVolume(params) {
    const R = params.caliber/2;
    const rho = computeTangentOgiveRadius(params.nose_length, params.caliber);

    const raw = R - params.boat_tail_length*Math.tan(params.boat_tail_angle*Math.PI/180);
    const btR = Math.max(raw, 0.005);

    const body = Math.max(params.overall_length - params.nose_length - params.boat_tail_length, 0);

    const N = 1000;
    const dx = params.overall_length / N;

    let total = 0;

    for (let i=0;i<=N;i++) {
        const x = i*dx;
        let r;

        if (x <= params.nose_length)
            r = computeOgiveY(x, R, rho);
        else if (x <= params.nose_length + body)
            r = R;
        else {
            const t = (x - params.nose_length - body)/params.boat_tail_length;
            r = R + t*(btR - R);
        }

        const w = (i===0 || i===N) ? 0.5 : 1;
        total += w*r*r;
    }

    return Math.PI * total * dx;
}

export function computeCenterOfMass(params) {
    const R = params.caliber / 2;

    const raw = R - params.boat_tail_length * Math.tan(params.boat_tail_angle * Math.PI/180);
    const btR = Math.max(raw, 0.005);

    const body = Math.max(
        params.overall_length - params.nose_length - params.boat_tail_length,
        0
    );

    const rho = computeTangentOgiveRadius(params.nose_length, params.caliber);

    const N = 1000;
    const dx = params.overall_length / N;

    let volumeSum = 0;
    let momentSum = 0;

    for (let i = 0; i <= N; i++) {
        const x = i * dx;

        let r;

        if (x <= params.nose_length)
            r = computeOgiveY(x, R, rho);
        else if (x <= params.nose_length + body)
            r = R;
        else {
            const t = (x - params.nose_length - body) / params.boat_tail_length;
            r = R + t * (btR - R);
        }

        const w = (i === 0 || i === N) ? 0.5 : 1;

        const dV = Math.PI * r * r * dx * w;

        volumeSum += dV;
        momentSum += x * dV;
    }

    return momentSum / volumeSum;
}

export function computeBallistics(params) {
    const D = params.caliber;

    const volume_in3 = computeVolume(params);
    const volume_cc = volume_in3 * 16.3871;

    const mass_g = volume_cc * 10.8;
    const mass_gr = mass_g * 15.4324;
    const mass_lb = mass_gr / 7000;

    const sd = mass_lb / (D*D);

    const base = { tangent:1.03, secant:0.96, hybrid:0.99 };

    let i7 = base[params.ogive_type]
        -0.015*(params.nose_length/D - 3)
        -0.006*(params.boat_tail_angle - 7)
        -0.005*((params.boat_tail_length/D - 0.5)/0.1);

    i7 = Math.max(0.70, Math.min(1.40, i7));

    const bc_g7 = sd / i7;
    const bc_g1 = bc_g7 / 0.47;

    return { volume_in3, mass_gr, sd, bc_g7, bc_g1 };
}

export function computeRequiredVelocityForStability(params, options = {}) {
    const {
        mass_gr,
        twist_in,     // inches per turn (e.g. 10)
        stability,
        airDensityRatio = 1.0
    } = options;

    if (!isFinite(mass_gr) || !isFinite(twist_in) || !isFinite(stability)) {
        return NaN;
    }

    const d = params.caliber;                 // inches
    const l_cal = params.overall_length / d;  // calibers

    const t = twist_in / d; // 🔥 critical: calibers per turn

    const numerator = 30 * mass_gr * airDensityRatio;

    const denominator =
        stability *
        Math.pow(d, 3) *
        l_cal *
        (1 + l_cal * l_cal);

    const v = t * Math.sqrt(numerator / denominator);

    return v; // fps
}
