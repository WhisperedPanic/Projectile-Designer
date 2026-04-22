import { computeProjectileOutline, computeNoseProfile } from "../geometry/geometry.js";
import { computeBallistics, computeCenterOfMass, computeMinTwistRate } from "../ballistics/ballistics.js";

export function analyze(params) {
    const ballistics = computeBallistics(params);
    const com = computeCenterOfMass(params);
    const twist = computeMinTwistRate(T);
    return {
        geometry: params,
        ballistics,
        stability: {
            center_of_mass: com,
            twist_rate: twist
        },
        points: {
            outline: computeProjectileOutline(params),
            nose: computeNoseProfile(params)
        }
    };
}
