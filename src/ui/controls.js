import { MATERIALS } from "../data/materials.js";
import { INPUT_STEPS, UNIT_LABELS } from "../units/units.js";

export function bindControls(onUpdate) {
    document.getElementById("updateBtn").onclick = () => {
        const params = {
            caliber:          +document.getElementById("caliber").value,
            overall_length:   +document.getElementById("overall_length").value,
            nose_length:      +document.getElementById("nose_length").value,
            boat_tail_length: +document.getElementById("boat_tail_length").value,
            boat_tail_angle:  +document.getElementById("boat_tail_angle").value,
            ogive_type:        document.getElementById("ogive_type").value
        };
        onUpdate(params);
    };

    document.getElementById("twist_select").onchange    = () => onUpdate({});
    document.getElementById("sg_select").onchange       = () => onUpdate({});
    document.getElementById("material_select").onchange = () => onUpdate({});
}

export function populateMaterials(defaultId) {
    const sel = document.getElementById("material_select");
    sel.innerHTML = "";

    MATERIALS.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.label} - (${m.density_gcc} g/cc)`;

        if (m.id === defaultId) opt.selected = true;
        sel.appendChild(opt);
    });
}

export function populateInputs(params) {
    for (const k in params) {
        const el = document.getElementById(k);
        if (el) el.value = params[k];
    }
}

/**
 * Update all unit labels, input step attributes, and toggle label styling
 * when the unit mode changes.
 */
export function updateUnitLabels(mode) {
    const lbl   = UNIT_LABELS[mode].length;
    const steps = INPUT_STEPS[mode];

    document.querySelectorAll(".ulbl").forEach(el => {
        el.textContent = lbl;
    });

    for (const [id, step] of Object.entries(steps)) {
        const el = document.getElementById(id);
        if (el) el.step = step;
    }

    const lblImperial = document.getElementById("lbl_imperial");
    const lblMetric   = document.getElementById("lbl_metric");
    if (lblImperial) lblImperial.classList.toggle("active", mode === "imperial");
    if (lblMetric)   lblMetric.classList.toggle("active",   mode === "metric");
}
