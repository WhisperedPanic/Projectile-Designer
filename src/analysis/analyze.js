import { computeProjectileOutline, computeNoseProfile } from "../geometry/geometry.js";
import { computeBallistics } from "../ballistics/ballistics.js";

export function analyze(params) {
    return {
        geometry: params,
        ballistics: computeBallistics(params),
        points: {
            outline: computeProjectileOutline(params),
            nose: computeNoseProfile(params)
        }
    };
}
