/**
 * visualizer.js
 * Canvas 2D renderer for hybrid ogive projectile outlines.
 * Depends on window.OgiveGeometry (geometry.js must load first).
 * Exposed on window.OgiveVisualizer
 *
 * Orientation: base (breech) on LEFT, tip (meplat) on RIGHT.
 */
(function (global) {
  "use strict";

  var Geo = global.OgiveGeometry;

  // ── Colour palette ─────────────────────────────────────────────────────────
  var COLORS = {
    background:   "#0f1117",
    grid:         "rgba(255,255,255,0.06)",
    gridAxis:     "rgba(255,255,255,0.18)",
    outline:      "#e8e8e8",
    fill:         "rgba(160,180,200,0.10)",
    tangent:      "#4fc3f7",
    secant:       "#f06292",
    blendDot:     "#ffd54f",
    blendLine:    "rgba(255,213,79,0.35)",
    contactDot:   "#a5d6a7",
    centerline:   "rgba(255,255,255,0.12)",
    dimension:    "rgba(255,255,255,0.55)",
    labelBg:      "rgba(15,17,23,0.75)",
    warning:      "#ef9a9a",
    ok:           "#a5d6a7",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  var _canvas  = null;
  var _ctx     = null;
  var _params  = null;
  var _options = {};

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(canvasEl, initialOptions) {
    _canvas  = canvasEl;
    _ctx     = canvasEl.getContext("2d");
    _options = Object.assign({
      showGrid:       true,
      showBlendPoint: true,
      showDimensions: true,
      showWarnings:   true,
      showSections:   true,
    }, initialOptions || {});
  }

  function render(params) {
    _params = params;
    _draw();
  }

  function setOption(key, value) {
    _options[key] = value;
    if (_params) _draw();
  }

  // ── Main draw ──────────────────────────────────────────────────────────────
  function _draw() {
    var W   = _canvas.width;
    var H   = _canvas.height;
    var ctx = _ctx;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    var outline;
    try {
      outline = Geo.computeProjectileOutline(_params);
    } catch (e) {
      _drawError(e.message);
      return;
    }

    var geo = outline.geometry;
    if (!geo.valid) {
      _drawError(geo.warnings.join("\n"));
      return;
    }

    // ── Viewport transform ─────────────────────────────────────────────────
    var pad   = { top: 60, bottom: 60, left: 40, right: 60 };
    var drawW = W - pad.left - pad.right;
    var drawH = H - pad.top  - pad.bottom;

    var xMin  = 0;
    var xMax  = _params.overall_length;
    var yMax  = _params.caliber / 2 * 1.18;

    var scaleX = drawW / (xMax - xMin);
    var scaleY = drawH / (2 * yMax);
    var scale  = Math.min(scaleX, scaleY);

    // Flipped: x=0 (tip) → right edge,  x=overall_length (base) → left edge
    // tx(x) = pad.left + (xMax - x) * scale
    var ox = pad.left;
    var oy = pad.top + drawH / 2;

    function tx(x) { return ox + (xMax - x) * scale; }
    function ty(y) { return oy - y * scale; }

    // ── Grid ───────────────────────────────────────────────────────────────
    if (_options.showGrid) {
      _drawGrid(ctx, W, H, pad, _params.overall_length, _params.caliber, scale, tx, ty);
    }

    // ── Centerline ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = COLORS.centerline;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(tx(0), ty(0));
    ctx.lineTo(tx(_params.overall_length), ty(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Fill ───────────────────────────────────────────────────────────────
    var path = new Path2D();
    path.moveTo(tx(outline[0].x), ty(outline[0].y));
    for (var i = 1; i < outline.length; i++) {
      path.lineTo(tx(outline[i].x), ty(outline[i].y));
    }
    path.closePath();
    ctx.fillStyle = COLORS.fill;
    ctx.fill(path);

    // ── Coloured sections ──────────────────────────────────────────────────
    if (_options.showSections && outline.blendPoint) {
      _drawSections(ctx, outline, geo, _params, tx, ty);
    } else {
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = "round";
      ctx.stroke(path);
    }

    // ── Blend point marker ─────────────────────────────────────────────────
    if (_options.showBlendPoint && outline.blendPoint) {
      var bx  = tx(outline.blendPoint.x);
      var byU = ty(outline.blendPoint.y);
      var byL = ty(-outline.blendPoint.y);
      _drawDot(ctx, bx, byU, 5, COLORS.blendDot);
      _drawDot(ctx, bx, byL, 5, COLORS.blendDot);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = COLORS.blendLine;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(bx, byU);
      ctx.lineTo(bx, byL);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Cone contact dot ───────────────────────────────────────────────────
    if (geo.x_contact != null) {
      var cx_ol = _params.nose_length - geo.x_contact;
      var cy_ol = Geo.sampleNoseY(geo.x_contact, _params, geo);
      _drawDot(ctx, tx(cx_ol), ty(cy_ol),  4, COLORS.contactDot);
      _drawDot(ctx, tx(cx_ol), ty(-cy_ol), 4, COLORS.contactDot);
    }

    // ── Dimensions ─────────────────────────────────────────────────────────
    if (_options.showDimensions) {
      _drawDimensions(ctx, _params, geo, tx, ty, pad, H);
    }

    // ── Warnings ───────────────────────────────────────────────────────────
    if (_options.showWarnings && geo.warnings.length > 0) {
      _drawWarnings(ctx, geo.warnings, W, H);
    }

    // ── Info panel ─────────────────────────────────────────────────────────
    _drawInfoPanel(ctx, geo, pad);
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  function _drawGrid(ctx, W, H, pad, totalLen, caliber, scale, tx, ty) {
    var R       = caliber / 2;
    var rawStep = totalLen / 10;
    var mag     = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var step    = Math.ceil(rawStep / mag) * mag;

    ctx.save();
    ctx.lineWidth = 1;

    for (var x = 0; x <= totalLen + step * 0.01; x += step) {
      var px = tx(x);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, H - pad.bottom);
      ctx.stroke();
    }

    var yStep = R / 3;
    for (var y = -R * 1.1; y <= R * 1.1; y += yStep) {
      var py = ty(y);
      ctx.strokeStyle = (Math.abs(y) < 1e-9) ? COLORS.gridAxis : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(W - pad.right, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Coloured sections ─────────────────────────────────────────────────────
  function _drawSections(ctx, outline, geo, params, tx, ty) {
    var blendX_ol = outline.blendPoint.x;

    function strokeSegment(pts, color) {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(tx(pts[i].x), ty(pts[i].y));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = "round";
      ctx.stroke();
    }

    function splitAtBlend(halfPts) {
      var secant = [], tangent = [];
      for (var i = 0; i < halfPts.length; i++) {
        var p = halfPts[i];
        if (p.x <= blendX_ol) {
          secant.push(p);
        } else {
          if (tangent.length === 0 && secant.length > 0) {
            secant.push(p);
            tangent.push(p);
          } else {
            tangent.push(p);
          }
        }
      }
      return { secant: secant, tangent: tangent };
    }

    var upper = [];
    for (var i = 0; i < outline.length; i++) {
      if (outline[i].y >= -0.001) upper.push(outline[i]);
      if (i > 0 && outline[i].y < -0.001) break;
    }
    var uSplit = splitAtBlend(upper);
    strokeSegment(uSplit.secant,  COLORS.secant);
    strokeSegment(uSplit.tangent, COLORS.tangent);

    var lower = upper.map(function (p) { return { x: p.x, y: -p.y }; });
    var lSplit = splitAtBlend(lower);
    strokeSegment(lSplit.secant,  COLORS.secant);
    strokeSegment(lSplit.tangent, COLORS.tangent);

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    var lastUpper = upper[upper.length - 1];
    ctx.moveTo(tx(lastUpper.x), ty(lastUpper.y));
    ctx.lineTo(tx(lastUpper.x), ty(-lastUpper.y));
    ctx.stroke();

    _drawSectionLegend(ctx);
  }

  function _drawSectionLegend(ctx) {
    var x = 12, y = 12;
    var items = [
      { color: COLORS.secant,     label: "Secant section"  },
      { color: COLORS.tangent,    label: "Tangent section" },
      { color: COLORS.blendDot,   label: "Blend point"     },
      { color: COLORS.contactDot, label: "Cone contact"    },
    ];
    ctx.save();
    ctx.font = "11px monospace";
    items.forEach(function (item, idx) {
      var lx = x, ly = y + idx * 18;
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, ly, 12, 3);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(item.label, lx + 18, ly + 4);
    });
    ctx.restore();
  }

  // ── Dot ───────────────────────────────────────────────────────────────────
  function _drawDot(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Dimensions ────────────────────────────────────────────────────────────
  function _drawDimensions(ctx, params, geo, tx, ty, pad, H) {
    ctx.save();
    ctx.font        = "11px monospace";
    ctx.fillStyle   = COLORS.dimension;
    ctx.strokeStyle = COLORS.dimension;
    ctx.lineWidth   = 1;

    var R        = params.caliber / 2;
    var yDimLine = H - pad.bottom + 22;
    var unit     = params.caliber > 5 ? "mm" : "\"";

    function dimArrow(x1, x2, label) {
      var px1 = tx(x1), px2 = tx(x2);
      var mid = (px1 + px2) / 2;
      ctx.beginPath(); ctx.moveTo(px1, yDimLine); ctx.lineTo(px2, yDimLine); ctx.stroke();
      [px1, px2].forEach(function (px) {
        ctx.beginPath(); ctx.moveTo(px, yDimLine - 4); ctx.lineTo(px, yDimLine + 4); ctx.stroke();
      });
      ctx.fillStyle = COLORS.dimension;
      var tw = ctx.measureText(label).width;
      ctx.fillText(label, mid - tw / 2, yDimLine + 14);
    }

    // Outline coords: x=0=tip (right), x=overall_length=base (left)
    dimArrow(0, params.nose_length,
      "NL " + params.nose_length.toFixed(3) + unit);

    if (params.boat_tail_length > 0) {
      var btStart = params.overall_length - params.boat_tail_length;
      dimArrow(btStart, params.overall_length,
        "BT " + params.boat_tail_length.toFixed(3) + unit);
    }

    dimArrow(0, params.overall_length,
      "OAL " + params.overall_length.toFixed(3) + unit);

    // Caliber vertical arrow — now on LEFT side (base)
    var xLeft = tx(params.overall_length) - 18;
    ctx.beginPath(); ctx.moveTo(xLeft, ty(R)); ctx.lineTo(xLeft, ty(-R)); ctx.stroke();
    [ty(R), ty(-R)].forEach(function (py) {
      ctx.beginPath(); ctx.moveTo(xLeft - 4, py); ctx.lineTo(xLeft + 4, py); ctx.stroke();
    });
    var calLabel = "cal " + params.caliber.toFixed(3) + unit;
    ctx.save();
    ctx.translate(xLeft - 14, ty(0));
    ctx.rotate(-Math.PI / 2);
    var tw2 = ctx.measureText(calLabel).width;
    ctx.fillText(calLabel, -tw2 / 2, 4);
    ctx.restore();

    ctx.restore();
  }

  // ── Info panel ────────────────────────────────────────────────────────────
  function _drawInfoPanel(ctx, geo, pad) {
    var lines = [
      geo.modeLabel,
      "R\u209b/R\u209c = " + geo.ratio,
      "Ogive = " + geo.ogiveRatio + " cal",
      "Meplat \u00f8 " + (geo.r_tip_mm ? (geo.r_tip_mm * 2).toFixed(3) + " mm" : "\u2014"),
      "Tip slope " + (geo.tipSlopeDeg != null ? geo.tipSlopeDeg.toFixed(2) + "\u00b0" : "\u2014"),
      "Blend @ " + (geo.blendFraction * 100).toFixed(0) + "% from tip",
    ];

    ctx.save();
    ctx.font = "12px monospace";
    var lineH  = 17;
    var panelW = 210;
    var panelH = lines.length * lineH + 12;
    var px     = pad.left + 10;
    var py     = pad.top  + 10;

    ctx.fillStyle = COLORS.labelBg;
    ctx.fillRect(px - 4, py - 4, panelW, panelH);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    lines.forEach(function (line, i) {
      ctx.fillText(line, px, py + (i + 1) * lineH - 3);
    });
    ctx.restore();
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  function _drawWarnings(ctx, warnings, W, H) {
    ctx.save();
    ctx.font = "11px monospace";
    var lineH  = 16;
    var maxW   = W * 0.38;
    var panelH = warnings.length * lineH + 12;
    var px     = W - maxW - 10;
    var py     = H - panelH - 10;

    ctx.fillStyle = "rgba(30,10,10,0.80)";
    ctx.fillRect(px - 4, py - 4, maxW + 8, panelH + 4);
    warnings.forEach(function (w, i) {
      ctx.fillStyle = COLORS.warning;
      ctx.fillText("\u26a0 " + w, px, py + (i + 1) * lineH - 3);
    });
    ctx.restore();
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  function _drawError(msg) {
    var ctx = _ctx, W = _canvas.width, H = _canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.warning;
    ctx.font      = "14px monospace";
    msg.split("\n").forEach(function (line, i) {
      ctx.fillText("\u26a0 " + line, 20, 40 + i * 20);
    });
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    if (!_canvas) return;
    _canvas.width  = _canvas.offsetWidth  || _canvas.width;
    _canvas.height = _canvas.offsetHeight || _canvas.height;
    if (_params) _draw();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  global.OgiveVisualizer = {
    init:      init,
    render:    render,
    setOption: setOption,
    resize:    resize,
    COLORS:    COLORS,
  };

}(window));
