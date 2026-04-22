export function bindControls(onUpdate) {
    document.getElementById("updateBtn").onclick = () => {
        const params = {
            caliber: +caliber.value,
            overall_length: +overall_length.value,
            nose_length: +nose_length.value,
            boat_tail_length: +boat_tail_length.value,
            boat_tail_angle: +boat_tail_angle.value,
            ogive_type: ogive_type.value
        };

        onUpdate(params);
    };

    // Also update when dropdowns change
    document.getElementById("twist_select").onchange = () => onUpdate({});
    document.getElementById("sg_select").onchange = () => onUpdate({});
}

export function populateInputs(params) {
    for (const k in params) {
        if (document.getElementById(k))
            document.getElementById(k).value = params[k];
    }
}
