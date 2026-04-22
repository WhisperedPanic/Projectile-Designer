import { state, setParams } from "./state/projectileState.js";
import { analyze } from "./analysis/analyze.js";
import { render } from "./render/svgRenderer.js";
import { bindControls, populateInputs } from "./ui/controls.js";

function update(newParams) {
    setParams(newParams);
    state.result = analyze(state.params);
    render(state);
}

function init() {
    populateInputs(state.params);
    bindControls(update);
    update({});
}

init();
