import { computeOgiveY, computeTangentOgiveRadius } from "../geometry/geometry.js";

export function integrateProjectile(params) {
    const R = params.caliber / 2;
    const rho = computeTangentOgiveRadius(params.nose_length, params.caliber);

    const raw = R - params.boat_tail_length * Math.tan(params.boat_tail_angle * Math.PI/180);
    const btR = Math.max(raw, 0.005);

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

        volume += dV;
        xMoment += x * dV;

        // axial inertia
        inertia += 0.5 * r * r * dV;
    }

    const com = xMoment / volume;

    return { volume, com, inertia };
}


// ---- CP from projected area centroid ----
export function computeCenterOfPressure(outline) {
    let A = 0;
    let xA = 0;

    for (let i = 0; i < outline.length - 1; i++) {
        const p1 = outline[i];
        const p2 = outline[i + 1];

        const dx = p2.x - p1.x;
        const avgHeight = (Math.abs(p1.y) + Math.abs(p2.y)) / 2;

        const dA = avgHeight * dx;
        const xMid = (p1.x + p2.x) / 2;

        A += dA;
        xA += xMid * dA;
    }

    return xA / A;
}


// ---- Mass + SD (unchanged logic) ----
export function computeBallistics(params, volume) {
    const volume_cc = volume * 16.3871;
    const density = 10.8;

    const mass_g = volume_cc * density;
    const mass_gr = mass_g * 15.4324;
    const mass_lb = mass_gr / 7000;

    const sd = mass_lb / (params.caliber * params.caliber);

    return {
        volume_in3: volume,
        mass_gr,
        sd
    };
}


// ---- Stability index ----
export function computeStabilityIndex(params, data, velocity, twist) {
    const omega = (2 * Math.PI * velocity) / twist;

    const lever = data.cp - data.com;
    if (lever <= 0) return 0;

    const area = Math.PI * Math.pow(params.caliber / 2, 2);
    const q = 0.5 * 1.225 * velocity * velocity;

    return (data.inertia * omega * omega) / (q * area * lever);
}


// ---- Solve velocity ----
export function solveVelocityForStability(params, data, target, twist) {
    let v = 100;

    for (let i = 0; i < 40; i++) {
        const s = computeStabilityIndex(params, data, v, twist);
        if (s <= 0) return 0;

        v *= Math.sqrt(target / s);
    }

    return v;
}