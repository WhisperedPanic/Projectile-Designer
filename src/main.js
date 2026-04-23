import { state, setParams } from "./state/projectileState.js";
import { analyze } from "./analysis/analyze.js";
import { render } from "./render/svgRenderer.js";
import { bindControls, populateInputs, populateMaterials, updateUnitLabels } from "./ui/controls.js";
import { computeActualSg } from "./ballistics/ballistics.js";
import { getMaterialById } from "./data/materials.js";
import { toPhysicsParams, toDisplayParams } from "./units/units.js";

let unitMode = "imperial";

/**
 * Core update cycle.
 * rawParams: values as entered by the user (in current display unit).
 * If empty {}, only re-reads material/twist/sg dropdowns.
 */
function update(rawParams) {
    // Convert length inputs from display unit → imperial before physics
    const physicsParams = toPhysicsParams(rawParams, unitMode);

    // Material density from dropdown
    const selectedId = document.getElementById("material_select")?.value;
    const material   = getMaterialById(selectedId);

    setParams({ ...physicsParams, material: material.id, density_gcc: material.density_gcc });

    // Run physics (always receives imperial values)
    state.result = analyze(state.params);

    // Stability check (dimensionless — no unit conversion needed)
    const twist    = +document.getElementById("twist_select")?.value || 10;
    const targetSg = +document.getElementById("sg_select")?.value    || 1.5;

    const actualSg = computeActualSg(state.params, {
        mass_gr:  state.result.ballistics.mass_gr,
        twist_in: twist
    });

    state.sanity = { twist, targetSg, actualSg };

    render(state, unitMode);
}

function init() {
    populateMaterials(state.params.material);

    // Populate inputs in the starting unit (imperial)
    populateInputs(toDisplayParams(state.params, unitMode));
    updateUnitLabels(unitMode);

    bindControls(update);

    // Unit toggle handler — reformats display without re-entering physics
    document.getElementById("unit_toggle").onchange = function () {
        unitMode = this.checked ? "metric" : "imperial";
        updateUnitLabels(unitMode);
        // Convert currently stored imperial state params to the new display unit
        populateInputs(toDisplayParams(state.params, unitMode));
        // Re-render the JSON panel in the new unit (no physics re-run needed)
        render(state, unitMode);
    };

    update({});
}

init();
