import { computeProjectileOutline, computeNoseProfile } from "../geometry/geometry.js";
import { computeBallistics, computeCenterOfMass } from "../ballistics/ballistics.js";

export function analyze(params) {
    const ballistics = computeBallistics(params);
    const com = computeCenterOfMass(params);

    return {
        geometry: params,
        ballistics,
        stability: {
            center_of_mass: com
        },
        points: {
            outline: computeProjectileOutline(params),
            nose: computeNoseProfile(params)
        }
    };
}
