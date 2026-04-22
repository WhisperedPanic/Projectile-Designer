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
    el.setAttribute("stroke-dasharray="4"","lime");
    el.setAttribute("fill","none");

    svg.appendChild(el);

    document.getElementById("output").textContent =
        JSON.stringify(state.result, null, 2);
}
