import { state, setParams } from "./state/projectileState.js";
import { analyze } from "./analysis/analyze.js";
import { render } from "./render/svgRenderer.js";
import { bindControls, populateInputs } from "./ui/controls.js";
import { computeRequiredVelocityForStability } from "./ballistics/ballistics.js";

function update(newParams) {
    setParams(newParams);
    state.result = analyze(state.params);

    const twist = +document.getElementById("twist_select")?.value || 10;
    const sg = +document.getElementById("sg_select")?.value || 1.5;

    const velocity = computeRequiredVelocityForStability(state.params, {
        mass_gr: state.result.ballistics.mass_gr,
        twist_in: twist,
        stability: sg
    });

    state.sanity = {
        twist,
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
