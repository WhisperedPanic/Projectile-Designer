export function render(state) {
    const svg = document.getElementById("canvas");
    svg.innerHTML = "";

    const pts = state.result.points.outline;

    // ---- AUTO SCALE TO FIT VIEW ----
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 200;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    const padding = 20;

    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);

    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding - minX * scale;
    const offsetY = height / 2;

    // ---- AXIS ----
    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", offsetX + minX * scale);
    axis.setAttribute("y1", offsetY);
    axis.setAttribute("x2", offsetX + maxX * scale);
    axis.setAttribute("y2", offsetY);
    axis.setAttribute("stroke", "#444");
    axis.setAttribute("stroke-dasharray", "4,4");
    svg.appendChild(axis);

    // ---- SHAPE ----
    const path = pts.map((p, i) =>
        (i === 0 ? "M" : "L") +
        (p.x * scale + offsetX) + "," +
        (-p.y * scale + offsetY)
    ).join(" ");

    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", path);
    el.setAttribute("stroke", "red");
    el.setAttribute("fill", "none");

    svg.appendChild(el);

    // ---- COM ----
    const com = state.result.stability.center_of_mass;
    drawCOM(svg, com, scale, offsetX, offsetY);

    // ---- OUTPUT ----
    document.getElementById("output").textContent =
        JSON.stringify(state.result, null, 2);

    // ---- SANITY DISPLAY ----
    const sanity = state.sanity;

    if (sanity) {
        document.getElementById("sanity_output").textContent =
            `Twist: 1:${sanity.twist}" | ` +
            `Target Sg: ${sanity.sg} | ` +
            `Required Velocity: ${sanity.velocity.toFixed(0)} m/s`;
    }
}


function drawCOM(svg, comX, scale, offsetX, offsetY) {
    const x = comX * scale + offsetX;
    const y = offsetY;

    const size = 6;

    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", x - size);
    line1.setAttribute("y1", y - size);
    line1.setAttribute("x2", x + size);
    line1.setAttribute("y2", y + size);
    line1.setAttribute("stroke", "lime");
    line1.setAttribute("stroke-width", "2");

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", x - size);
    line2.setAttribute("y1", y + size);
    line2.setAttribute("x2", x + size);
    line2.setAttribute("y2", y - size);
    line2.setAttribute("stroke", "lime");
    line2.setAttribute("stroke-width", "2");

    svg.appendChild(line1);
    svg.appendChild(line2);
}