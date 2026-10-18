/* Story typography. Cover type stays separate.
   Size follows the reader. Ink follows the background behind the words. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookType = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var FACE = "Nunito, sans-serif";
  var INK = { dark: "#2a241c", light: "#fff8ee" };
  var STAGES = {
    reception: { minPx: 22, cqh: 4.6, lineHeight: 1.5, maxCh: 22, weight: 700, large: true },
    year1: { minPx: 20, cqh: 4.1, lineHeight: 1.46, maxCh: 26, weight: 700, large: true },
    year2: { minPx: 18, cqh: 3.6, lineHeight: 1.44, maxCh: 32, weight: 700, large: true },
    year3: { minPx: 17, cqh: 3.3, lineHeight: 1.4, maxCh: 36, weight: 700, large: true },
    year4: { minPx: 16, cqh: 3.05, lineHeight: 1.38, maxCh: 40, weight: 650, large: false },
    year5: { minPx: 16, cqh: 2.85, lineHeight: 1.36, maxCh: 44, weight: 650, large: false },
    year6: { minPx: 15, cqh: 2.65, lineHeight: 1.34, maxCh: 48, weight: 600, large: false }
  };
  var YEAR_STAGE = {
    Reception: "reception",
    "Year 1": "year1",
    "Year 2": "year2",
    "Year 3": "year3",
    "Year 4": "year4",
    "Year 5": "year5",
    "Year 6": "year6"
  };
  var EDGE = 0.05;
  var FOLD = 0.045;

  function stageOf(profile) {
    var source = profile || {};
    if (STAGES[source.stage]) return source.stage;
    if (YEAR_STAGE[source.constraintYear]) return YEAR_STAGE[source.constraintYear];
    if (YEAR_STAGE[source.yearGroup]) return YEAR_STAGE[source.yearGroup];
    return "year2";
  }

  function metricsFor(profile) {
    var stage = stageOf(profile);
    var row = STAGES[stage];
    return {
      stage: stage,
      face: FACE,
      minPx: row.minPx,
      cqh: row.cqh,
      lineHeight: row.lineHeight,
      maxCh: row.maxCh,
      weight: row.weight,
      contrastFloor: row.large ? 3.2 : 4.5
    };
  }

  function lin(channel) {
    var c = channel <= 1 ? channel : channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(red, green, blue) {
    return 0.2126 * lin(red) + 0.7152 * lin(green) + 0.0722 * lin(blue);
  }

  function inkLuminance(ink) {
    if (ink === "light") return luminance(1, 248 / 255, 238 / 255);
    return luminance(42 / 255, 36 / 255, 28 / 255);
  }

  function contrastRatio(background, foreground) {
    var lighter = Math.max(background, foreground);
    var darker = Math.min(background, foreground);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function median(values) {
    var list = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(list.length / 2);
    if (!list.length) return 0.5;
    if (list.length % 2) return list[mid];
    return (list[mid - 1] + list[mid]) / 2;
  }

  function sampleStats(sample) {
    var grid = (sample && sample.grid) || [];
    var width = sample && sample.width || 0;
    var height = sample && sample.height || 0;
    if (!grid.length) return { mean: 0.5, median: 0.5, variance: 0, edge: 0 };
    var sum = 0;
    grid.forEach(function (value) { sum += value; });
    var mean = sum / grid.length;
    var variance = 0;
    grid.forEach(function (value) { variance += (value - mean) * (value - mean); });
    variance /= grid.length;
    var edges = 0;
    var count = 0;
    var y;
    var x;
    if (width > 1 && height > 1 && grid.length >= width * height) {
      for (y = 0; y < height; y += 1) {
        for (x = 0; x < width; x += 1) {
          var here = grid[y * width + x];
          if (x + 1 < width) {
            edges += Math.abs(here - grid[y * width + x + 1]);
            count += 1;
          }
          if (y + 1 < height) {
            edges += Math.abs(here - grid[(y + 1) * width + x]);
            count += 1;
          }
        }
      }
    }
    return { mean: mean, median: median(grid), variance: variance, edge: count ? edges / count : 0 };
  }

  function chooseInk(level) {
    var dark = contrastRatio(level, inkLuminance("dark"));
    var light = contrastRatio(level, inkLuminance("light"));
    return dark >= light ? "dark" : "light";
  }

  function treatedLevel(level, ink, treatment) {
    if (treatment === "scrim") return ink === "light" ? level * 0.62 : level * 0.62 + 0.38;
    if (treatment === "halo") return ink === "light" ? level * 0.84 : level * 0.84 + 0.16;
    if (treatment === "shadow") return ink === "light" ? level * 0.94 : level * 0.94 + 0.06;
    return level;
  }

  function sideOf(region) {
    var text = String(region || "");
    if (text.indexOf("right") >= 0) return "right";
    if (text.indexOf("left") >= 0) return "left";
    return "";
  }

  function bandOf(region) {
    var text = String(region || "");
    if (text.indexOf("lower") >= 0) return "lower";
    if (text.indexOf("middle") >= 0) return "middle";
    return "upper";
  }

  function candidates(region, pageRole) {
    var side = sideOf(region);
    var band = bandOf(region);
    var fold = pageRole === "single-page" ? 0.02 : FOLD;
    var sides = side ? [side] : ["left", "right"];
    var shifts = band === "lower" ? [0.56, 0.64, 0.72] : (band === "middle" ? [0.3, 0.38, 0.46] : [0.055, 0.11, 0.17]);
    var boxes = [];
    sides.forEach(function (place) {
      shifts.forEach(function (top, index) {
        var x = place === "left" ? EDGE : null;
        var rightLimit = place === "left" ? (pageRole === "single-page" ? 0.62 : 0.5 - fold) : 1 - EDGE;
        var leftLimit = place === "right" ? (pageRole === "single-page" ? 0.38 : 0.5 + fold) : EDGE;
        if (place === "right") x = leftLimit;
        var width = rightLimit - (place === "left" ? EDGE : leftLimit);
        if (width < 0.16) return;
        boxes.push({
          id: place + "-" + index,
          side: place,
          x: place === "left" ? EDGE : leftLimit,
          y: top,
          w: width,
          h: 0.34
        });
      });
    });
    return boxes;
  }

  function units(text) {
    var source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) return [];
    var found = source.match(/"[^"]+"|[^.!?]+[.!?]+|[^.!?]+$/g) || [source];
    return found.map(function (part) {
      var line = part.trim();
      return { text: line, spoken: /^"[^"]+"[.!?]*$/.test(line) };
    }).filter(function (line) { return line.text; });
  }

  function estimateLines(text, maxCh) {
    var count = 0;
    units(text).forEach(function (line) {
      count += Math.max(1, Math.ceil(line.text.length / maxCh));
    });
    return count;
  }

  function sizePx(metrics, spreadHeight) {
    var height = spreadHeight || 640;
    return Math.max(metrics.minPx, (metrics.cqh / 100) * height);
  }

  function gutterClear(box, pageRole) {
    if (pageRole === "single-page") return box.x >= EDGE - 0.001 && box.x + box.w <= 1 - EDGE + 0.001;
    if (box.side === "left") return box.x + box.w <= 0.5 - FOLD + 0.001;
    if (box.side === "right") return box.x >= 0.5 + FOLD - 0.001;
    return box.x >= 0.5 + FOLD - 0.001 || box.x + box.w <= 0.5 - FOLD + 0.001;
  }

  function edgeClear(box) {
    return box.x >= EDGE - 0.001 && box.x + box.w <= 1 - EDGE + 0.001;
  }

  function scoreBox(box, stats, ink, ratio) {
    var foldGap = box.side === "left" ? (0.5 - (box.x + box.w)) : (box.x - 0.5);
    var edgeGap = Math.min(box.x, 1 - (box.x + box.w));
    var calm = 1 - Math.min(1, stats.variance * 12);
    var smooth = 1 - Math.min(1, stats.edge * 6);
    return ratio * 1.5 + calm * 2.4 + smooth * 1.8 + Math.max(0, foldGap) * 3 + Math.max(0, edgeGap) * 2;
  }

  function escalate(level, ink, stats, floor) {
    var steps = ["none", "shadow", "scrim", "halo"];
    var start = 0;
    if (stats.variance > 0.02 || stats.edge > 0.07) start = 2;
    else if (stats.variance > 0.008 || stats.edge > 0.04) start = 1;
    var chosen = steps[start];
    var ratio = contrastRatio(treatedLevel(level, ink, chosen), inkLuminance(ink));
    var index;
    for (index = start; index < steps.length; index += 1) {
      chosen = steps[index];
      ratio = contrastRatio(treatedLevel(level, ink, chosen), inkLuminance(ink));
      if (ratio >= floor) break;
    }
    return { treatment: chosen, contrast: ratio };
  }

  function place(options) {
    var ask = options || {};
    var metrics = metricsFor(ask.profile);
    var role = ask.pageRole || "double-page-spread";
    var region = ask.textSafeRegion || "upper-left";
    var boxes = candidates(region, role);
    var spreadWidth = ask.spreadWidth || 1000;
    var spreadHeight = ask.spreadHeight || Math.round(spreadWidth * 2 / 3);
    var px = sizePx(metrics, spreadHeight);
    var lines = estimateLines(ask.text, metrics.maxCh);
    var best = null;
    var textH = (lines * metrics.lineHeight * px) / spreadHeight;
    boxes.forEach(function (box) {
      var widthPx = Math.min(box.w * spreadWidth, metrics.maxCh * px * 0.52);
      var used = {
        id: box.id,
        side: box.side,
        x: box.x,
        y: box.y,
        w: widthPx / spreadWidth,
        h: textH
      };
      if (!gutterClear(used, role) || !edgeClear(used)) return;
      var sample = typeof ask.sample === "function" ? ask.sample(used) : (ask.samples && ask.samples[box.id]);
      var stats = sampleStats(sample || { grid: [0.55], width: 1, height: 1 });
      var ink = chooseInk(stats.median);
      var plain = contrastRatio(stats.median, inkLuminance(ink));
      var rank = scoreBox(used, stats, ink, plain);
      if (!best || rank > best.rank) {
        best = { box: used, stats: stats, ink: ink, rank: rank, plain: plain };
      }
    });
    if (!best) {
      best = {
        box: { id: "fallback", side: sideOf(region) || "left", x: EDGE, y: 0.08, w: 0.32, h: 0.3 },
        stats: { mean: 0.5, median: 0.5, variance: 0, edge: 0 },
        ink: "dark",
        rank: 0,
        plain: 1
      };
    }
    var stepped = escalate(best.stats.median, best.ink, best.stats, metrics.contrastFloor);
    var measureCh = Math.min(metrics.maxCh, Math.max(8, Math.round((best.box.w * spreadWidth) / (px * 0.52))));
    var layout = {
      face: metrics.face,
      stage: metrics.stage,
      ink: best.ink,
      color: INK[best.ink],
      treatment: stepped.treatment,
      contrast: stepped.contrast,
      plainContrast: best.plain,
      fontPx: px,
      fontRem: px / 16,
      minPx: metrics.minPx,
      lineHeight: metrics.lineHeight,
      weight: metrics.weight,
      maxCh: metrics.maxCh,
      measureCh: measureCh,
      lines: lines,
      box: best.box,
      region: region,
      pageRole: role,
      luminance: best.stats.median,
      variance: best.stats.variance,
      edge: best.stats.edge,
      gutterClear: gutterClear(best.box, role),
      edgeClear: edgeClear(best.box),
      fits: textH <= 0.36,
      linesOut: units(ask.text)
    };
    layout.problems = validate(layout, metrics);
    layout.ok = layout.problems.length === 0;
    return layout;
  }

  function validate(layout, metrics) {
    var problems = [];
    var row = metrics || metricsFor({ stage: layout.stage });
    if (layout.fontPx + 0.01 < row.minPx) problems.push("font-small");
    if (layout.measureCh > row.maxCh + 0.01) problems.push("measure-wide");
    if (layout.lineHeight + 0.001 < row.lineHeight) problems.push("leading-tight");
    if (!layout.fits) problems.push("overflow");
    if (!layout.gutterClear) problems.push("gutter");
    if (!layout.edgeClear) problems.push("page-edge");
    if (layout.contrast + 0.001 < row.contrastFloor) problems.push("contrast");
    return problems;
  }

  function escapeText(text) {
    return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function markup(layout) {
    return (layout.linesOut || []).map(function (line) {
      var spoken = line.spoken ? " is-spoken" : "";
      return "<span class=\"story-line" + spoken + "\">" + escapeText(line.text) + "</span>";
    }).join("");
  }

  function styleFor(layout) {
    var box = layout.box || { x: 0.06, y: 0.08, w: 0.3 };
    return {
      left: (box.x * 100).toFixed(2) + "%",
      top: (box.y * 100).toFixed(2) + "%",
      width: (box.w * 100).toFixed(2) + "%",
      fontSize: "max(" + layout.minPx + "px, " + (STAGES[layout.stage] ? STAGES[layout.stage].cqh : 3.6) + "cqh)",
      lineHeight: String(layout.lineHeight),
      fontWeight: String(layout.weight),
      color: layout.color,
      textAlign: "left"
    };
  }

  return {
    FACE: FACE,
    INK: INK,
    STAGES: STAGES,
    metricsFor: metricsFor,
    luminance: luminance,
    contrastRatio: contrastRatio,
    sampleStats: sampleStats,
    chooseInk: chooseInk,
    place: place,
    validate: validate,
    markup: markup,
    styleFor: styleFor,
    units: units,
    candidates: candidates
  };
});
