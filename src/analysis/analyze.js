import { computeProjectileOutline, computeNoseProfile } from "../geometry/geometry.js";
import {
    integrateProjectile,
    computeBallistics,
    computeCenterOfPressure
} from "../ballistics/ballistics.js";

export function analyze(params) {
    const outline = computeProjectileOutline(params);

    const { volume, com, inertia } = integrateProjectile(params);
    const cp = computeCenterOfPressure(outline);

    const ballistics = computeBallistics(params, volume);

    return {
        geometry: params,
        ballistics,
        stability: {
            center_of_mass: com,
            center_of_pressure: cp,
            inertia
        },
        points: {
            outline,
            nose: computeNoseProfile(params)
        }
    };
}