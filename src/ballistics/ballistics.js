import { computeOgiveY, computeTangentOgiveRadius } from "../geometry/geometry.js";

const AIR_DENSITY = 1.225;

// ---- INTEGRATION (UNCHANGED LOGIC, NOW METRIC INPUTS) ----
export function integrateProjectile(params) {
    const R = params.caliber / 2;
    const rho = computeTangentOgiveRadius(params.nose_length, params.caliber);

    const raw = R - params.boat_tail_length * Math.tan(params.boat_tail_angle * Math.PI / 180);
    const btR = Math.max(raw, 0.0001);

    const body = Math.max(
        params.overall_length - params.nose_length - params.boat_tail_length,
        0
    );

    const N = 1000;
    const dx = params.overall_length / N;

    let volume = 0;
    let xMoment = 0;
    let inertia = 0;

    for (let i = 0; i <= N; i++) {
        const x = i * dx;

        let r;
        if (x <= params.nose_length) {
            r = computeOgiveY(x, R, rho);
        } else if (x <= params.nose_length + body) {
            r = R;
        } else {
            const t = (x - params.nose_length - body) / params.boat_tail_length;
            r = R + t * (btR - R);
        }

        const w = (i === 0 || i === N) ? 0.5 : 1;

        const dV = Math.PI * r * r * dx * w;

        volume += dV;
        xMoment += x * dV;
        inertia += 0.5 * r * r * dV;
    }

    const com = volume > 0 ? xMoment / volume : 0;

    return { volume, com, inertia };
}


// ---- CP (UNCHANGED — YOUR WORKING VERSION) ----
export function computeCenterOfPressure(outline) {
    let A = 0;
    let xA = 0;

    for (let i = 0; i < outline.length - 1; i++) {
        const p1 = outline[i];
        const p2 = outline[i + 1];

        if (p1.y < 0 && p2.y < 0) continue;

        const dx = Math.abs(p2.x - p1.x);
        const avgHeight = (Math.abs(p1.y) + Math.abs(p2.y)) / 2;

        const dA = avgHeight * dx;
        const xMid = (p1.x + p2.x) / 2;

        A += dA;
        xA += xMid * dA;
    }

    return A > 0 ? xA / A : 0;
}


// ---- BALLISTICS (UNCHANGED) ----
export function computeBallistics(params, volume) {
    const volume_cc = volume * 1e6; // m^3 → cc
    const density = 10.8;

    const mass_g = volume_cc * density;
    const mass_gr = mass_g * 15.4324;
    const mass_kg = mass_g / 1000;

    const sd = mass_kg / (params.caliber * params.caliber);

    return {
        volume_in3: volume / 1.6387e-5, // back-convert for output
        mass_gr,
        sd
    };
}


// ---- FIXED STABILITY (REAL ISSUE WAS HERE) ----
export function computeStabilityIndex(params, data, velocity, twist) {
    const omega = (2 * Math.PI * velocity) / twist;

    const lever = Math.abs(data.cp - data.com);
    if (lever === 0) return 0;

    const area = Math.PI * Math.pow(params.caliber / 2, 2);
    const q = 0.5 * AIR_DENSITY * velocity * velocity;

    return (data.inertia * omega * omega) / (q * area * lever);
}


// ---- SOLVER (UNCHANGED LOGIC, STABLE NOW) ----
export function solveVelocityForStability(params, data, target, twist) {
    let v = 600; // m/s starting point

    for (let i = 0; i < 40; i++) {
        const s = computeStabilityIndex(params, data, v, twist);

        if (s <= 0) return 0;

        v *= Math.sqrt(target / s);
    }

    return v;
}