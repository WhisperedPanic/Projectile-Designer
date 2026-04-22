export function render(state) {
    const svg = document.getElementById("canvas");
    svg.innerHTML = "";

    const pts = state.result.points.outline;

    const scale = 400;
    const offsetX = 50;
    const offsetY = 100;

    const path = pts.map((p,i)=>
        (i===0?"M":"L") +
        (p.x*scale+offsetX)+","+
        (-p.y*scale+offsetY)
    ).join(" ");

    const el = document.createElementNS("http://www.w3.org/2000/svg","path");
    el.setAttribute("d", path);
    el.setAttribute("stroke","red");
    el.setAttribute("fill","none");

    svg.appendChild(el);

    // ---- COM ----
    drawCross(svg, state.result.stability.center_of_mass, scale, offsetX, offsetY, "lime");

    // ---- CP ----
    drawDot(svg, state.result.stability.center_of_pressure, scale, offsetX, offsetY, "cyan");

    // ---- Axis ----
    const axis = document.createElementNS("http://www.w3.org/2000/svg","line");
    axis.setAttribute("x1", offsetX);
    axis.setAttribute("y1", offsetY);
    axis.setAttribute("x2", offsetX + state.params.overall_length * scale);
    axis.setAttribute("y2", offsetY);
    axis.setAttribute("stroke", "#444");
    axis.setAttribute("stroke-dasharray","4 4");

    svg.appendChild(axis);

    // ---- Sanity ----
    if (state.sanity) {
        document.getElementById("sanity_output").textContent =
            `Twist: 1:${state.sanity.twist}" | ` +
            `Target Sg: ${state.sanity.sg} | ` +
            `Required Velocity: ${state.sanity.velocity.toFixed(0)} fps`;
    }

    document.getElementById("output").textContent =
        JSON.stringify(state.result, null, 2);
}


function drawCross(svg, xVal, scale, offsetX, offsetY, color) {
    const x = xVal * scale + offsetX;
    const y = offsetY;
    const size = 6;

    const l1 = document.createElementNS("http://www.w3.org/2000/svg","line");
    l1.setAttribute("x1", x-size);
    l1.setAttribute("y1", y-size);
    l1.setAttribute("x2", x+size);
    l1.setAttribute("y2", y+size);
    l1.setAttribute("stroke", color);

    const l2 = document.createElementNS("http://www.w3.org/2000/svg","line");
    l2.setAttribute("x1", x-size);
    l2.setAttribute("y1", y+size);
    l2.setAttribute("x2", x+size);
    l2.setAttribute("y2", y-size);
    l2.setAttribute("stroke", color);

    svg.appendChild(l1);
    svg.appendChild(l2);
}

function drawDot(svg, xVal, scale, offsetX, offsetY, color) {
    const x = xVal * scale + offsetX;
    const y = offsetY;

    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    c.setAttribute("r", 4);
    c.setAttribute("fill", color);

    svg.appendChild(c);
}