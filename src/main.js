import { state, setParams } from "./state/projectileState.js";
import { analyze } from "./analysis/analyze.js";
import { render } from "./render/svgRenderer.js";
import { bindControls, populateInputs } from "./ui/controls.js";
import { solveVelocityForStability } from "./ballistics/ballistics.js";

const IN_TO_M = 0.0254;

function update(newParams) {
    setParams(newParams);

    state.result = analyze(state.params);

    const twist_in = +document.getElementById("twist_select").value;
    const sg = +document.getElementById("sg_select").value;

    // 🔥 REQUIRED FIX: convert twist to meters
    const twist_m = twist_in * IN_TO_M;

    const velocity = solveVelocityForStability(
        state.result.geometry,
        {
            ...state.result.stability,
            cp: state.result.stability.center_of_pressure,
            com: state.result.stability.center_of_mass
        },
        sg,
        twist_m
    );

    state.sanity = {
        twist: twist_in,
        sg,
        velocity
    };

    render(state);
}

function init() {
    populateInputs(state.params);
    bindControls(update);
    update({});
}

init();