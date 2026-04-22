export function render(state) {
    const svg = document.getElementById("canvas");
    svg.innerHTML = "";

    const pts = state.result.points.outline;

    const scale = 400;
    const offsetX = 50;
    const offsetY = 100;

    // ---- Draw projectile ----
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

    // ---- Draw Axis ----
    const axis = document.createElementNS("http://www.w3.org/2000/svg","line");

    axis.setAttribute("x1", offsetX);
    axis.setAttribute("y1", offsetY);
    axis.setAttribute("x2", offsetX + state.params.overall_length * scale);
    axis.setAttribute("y2", offsetY);

    axis.setAttribute("stroke", "#444");
    axis.setAttribute("stroke-width", "1.5");
    axis.setAttribute("stroke-dasharray", "4,4");

    svg.appendChild(axis);
    
    // ---- Draw COM ----
    const com = state.result.stability.center_of_mass;
    drawCOM(svg, com, scale, offsetX, offsetY);

    // ---- Output JSON ----
    document.getElementById("output").textContent =
        JSON.stringify(state.result, null, 2);
}


// Keep this OUTSIDE render()
function drawCOM(svg, comX, scale, offsetX, offsetY) {
    const x = comX * scale + offsetX;
    const y = offsetY; // centerline

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
