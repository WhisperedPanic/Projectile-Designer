export const state = {
    params: {
        caliber: 0.308,
        overall_length: 1.2,
        nose_length: 0.45,
        boat_tail_length: 0.18,
        boat_tail_angle: 9.0,
        ogive_type: "tangent",
        material: "c10100",
        density_gcc: 9.84
    },
    result: null
};

export function setParams(newParams) {
    state.params = { ...state.params, ...newParams };
}