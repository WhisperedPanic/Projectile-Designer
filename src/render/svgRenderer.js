import { formatResultForDisplay } from "../units/units.js";

export function render(state, unitMode = "imperial") {
    const svg = document.getElementById("canvas");
    svg.innerHTML = "";

    const pts = state.result.points.outline;
    const L   = state.params.overall_length; // physics length (inches)

    const scale   = 400;
    const offsetX = 50;
    const offsetY = 100;

    // Flip x so that base (x=L) is on the LEFT and nose tip (x=0) is on the RIGHT.
    const toSvgX = x => offsetX + (L - x) * scale;

    // ---- Draw projectile ----
    const path = pts.map((p, i) =>
        (i === 0 ? "M" : "L") +
        toSvgX(p.x) + "," +
        (-p.y * scale + offsetY)
    ).join(" ");

    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", path);
    el.setAttribute("stroke", "red");
    el.setAttribute("fill", "none");
    svg.appendChild(el);

    // ---- Draw Axis ----
    // Spans from base (left) to nose tip (right) — same pixel range as before.
    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", toSvgX(L)); // base — left edge
    axis.setAttribute("y1", offsetY);
    axis.setAttribute("x2", toSvgX(0)); // nose tip — right edge
    axis.setAttribute("y2", offsetY);
    axis.setAttribute("stroke", "#444");
    axis.setAttribute("stroke-width", "1.5");
    axis.setAttribute("stroke-dasharray", "4,4");
    svg.appendChild(axis);

    // ---- Draw COM ----
    const com = state.result.stability.center_of_mass;
    drawCOM(svg, toSvgX(com), offsetY);

    // ---- Output JSON (formatted in selected unit system) ----
    const displayResult = formatResultForDisplay(state.result, unitMode);
    document.getElementById("output").textContent =
        JSON.stringify(displayResult, null, 2);

    // ---- SG Check ----
    const sanity = state.sanity;
    if (sanity) {
        const sgLabel = isFinite(sanity.actualSg) ? sanity.actualSg.toFixed(2) : "N/A";
        const stable  = isFinite(sanity.actualSg) && sanity.actualSg >= sanity.targetSg;
        document.getElementById("sanity_output").textContent =
            `Twist: 1:${sanity.twist}" | ` +
            `Target Sg: ${sanity.targetSg} | ` +
            `Computed Sg: ${sgLabel} ` +
            `(${stable ? "STABLE" : "UNSTABLE"})`;
    }
}

// Accepts a pre-computed SVG pixel x so the caller owns the coordinate transform.
function drawCOM(svg, svgX, svgY) {
    const size = 6;

    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", svgX - size);
    line1.setAttribute("y1", svgY - size);
    line1.setAttribute("x2", svgX + size);
    line1.setAttribute("y2", svgY + size);
    line1.setAttribute("stroke", "lime");
    line1.setAttribute("stroke-width", "2");

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", svgX - size);
    line2.setAttribute("y1", svgY + size);
    line2.setAttribute("x2", svgX + size);
    line2.setAttribute("y2", svgY - size);
    line2.setAttribute("stroke", "lime");
    line2.setAttribute("stroke-width", "2");

    svg.appendChild(line1);
    svg.appendChild(line2);
}
