import { computeProjectileOutline, computeNoseProfile } from "../geometry/geometry.js";
import {
    integrateProjectile,
    computeBallistics,
    computeCenterOfPressure
} from "../ballistics/ballistics.js";

// ---- UNIT CONVERSION ----
const IN_TO_M = 0.0254;

function toMetric(params) {
    return {
        ...params,
        caliber: params.caliber * IN_TO_M,
        overall_length: params.overall_length * IN_TO_M,
        nose_length: params.nose_length * IN_TO_M,
        boat_tail_length: params.boat_tail_length * IN_TO_M
    };
}

export function analyze(params) {
    const mParams = toMetric(params);

    const outline = computeProjectileOutline(mParams);

    const { volume, com, inertia } = integrateProjectile(mParams);
    const cp = computeCenterOfPressure(outline);

    const ballistics = computeBallistics(mParams, volume);

    return {
        geometry: mParams,
        ballistics,
        stability: {
            center_of_mass: com,
            center_of_pressure: cp,
            inertia
        },
        points: {
            outline,
            nose: computeNoseProfile(mParams)
        }
    };
}