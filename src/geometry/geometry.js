export function computeTangentOgiveRadius(L, caliber) {
    const R = caliber / 2;
    return (L*L + R*R) / (2*R);
}

export function computeOgiveY(x, R, rho) {
    const cx = Math.sqrt(Math.max(rho*rho - (rho - R)**2, 0));
    if (x <= 0) return 0;

    const disc = rho*rho - (x - cx)*(x - cx);
    if (disc < 0) return 0;

    return Math.max(Math.sqrt(disc) - (rho - R), 0);
}

export function computeNoseProfile(params, segments=120) {
    const R = params.caliber/2;
    const rho = computeTangentOgiveRadius(params.nose_length, params.caliber);

    const pts = [];

    for (let i=0;i<=segments;i++) {
        const x = (i/segments)*params.nose_length;
        pts.push({x, y:computeOgiveY(x, R, rho)});
    }

    if (Math.abs(pts.at(-1).y - R) > 1e-6)
        pts.push({x:params.nose_length, y:R});

    return pts;
}

export function computeProjectileOutline(params) {
    const R = params.caliber/2;

    const raw = R - params.boat_tail_length*Math.tan(params.boat_tail_angle*Math.PI/180);
    const btR = Math.max(raw, 0.005);

    const body = Math.max(params.overall_length - params.nose_length - params.boat_tail_length, 0);

    const upper = [...computeNoseProfile(params)];

    if (body > 0)
        upper.push({x: params.nose_length + body, y:R});

    for (let i=1;i<=30;i++) {
        const t = i/30;
        upper.push({
            x: params.nose_length + body + t*params.boat_tail_length,
            y: R + t*(btR - R)
        });
    }

    upper.push({x:params.overall_length, y:0});

    const lower = upper.slice(0,-1).reverse().map(p=>({x:p.x, y:-p.y}));

    return [...upper, ...lower];
}