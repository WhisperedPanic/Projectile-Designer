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


// --- ADDED: Hybrid Ogive Solver ---
export function solveHybridOgive({ D, Lh, Lm, Rt, xj }) {

    const R = D / 2;

    const xt = 0;
    const yt = R + Rt;

    const dx = xj - xt;
    const inside = Rt * Rt - dx * dx;

    if (inside <= 0) {
        throw new Error("Invalid join position: outside tangent circle");
    }

    const yj = yt - Math.sqrt(inside);

    let nx = (xj - xt);
    let ny = (yj - yt);

    const nLen = Math.hypot(nx, ny);
    nx /= nLen;
    ny /= nLen;

    const targetX = Lh;
    const targetY = Lm / 2;

    const dx2 = targetX - xj;
    const dy2 = targetY - yj;

    const dot = dx2 * nx + dy2 * ny;
    const dist2 = dx2 * dx2 + dy2 * dy2;

    const lambda = dist2 / (2 * dot);

    if (!isFinite(lambda) || lambda <= 0) {
        throw new Error("Invalid secant solution (lambda)");
    }

    const xs = xj + lambda * nx;
    const ys = yj + lambda * ny;

    return {
        R,
        tangent: { radius: Rt, center: [xt, yt] },
        secant: { radius: lambda, center: [xs, ys] },
        join: { x: xj, y: yj },
        meplat: { x: Lh, yTop: Lm / 2 }
    };
}


// --- MODIFIED: computeNoseProfile (hybrid support added) ---
export function computeNoseProfile(params, segments=120) {

    // --- HYBRID MODE ---
    if (params.ogive_type === "hybrid") {

        // --- APPROVED DESIGN ---
        const Lm = 1.3;                          // fixed meplat
        const Rt = 8 * params.caliber;           // derived tangent radius
        const xj = params.joinPosition;          // single user control

        const geo = solveHybridOgive({
            D: params.caliber,
            Lh: params.nose_length,
            Lm: Lm,
            Rt: Rt,
            xj: xj
        });

        const pts = [];

        const [xt, yt] = geo.tangent.center;
        const Rt_local = geo.tangent.radius;

        const [xs, ys] = geo.secant.center;
        const Rs = geo.secant.radius;

        // Tangent arc
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * geo.join.x;
            const y = yt - Math.sqrt(Rt_local*Rt_local - (x - xt)*(x - xt));

            if (pts.length === 0 || Math.abs(pts[pts.length - 1].x - x) > 1e-6) {
                pts.push({ x, y });
            }
        }

        // Secant arc
        for (let i = 0; i <= segments; i++) {
            const x = geo.join.x + (i / segments) * (geo.meplat.x - geo.join.x);
            const y = ys - Math.sqrt(Rs*Rs - (x - xs)*(x - xs));

            if (Math.abs(pts[pts.length - 1].x - x) > 1e-6) {
                pts.push({ x, y });
            }
        }

        return pts;
    }

    // --- EXISTING LOGIC (UNCHANGED) ---
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
