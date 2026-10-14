/** Rectangles for the cover and inside pages.
 * A picture keeps its own aspect. The book shape does not change to fit it. */

export function coverCanvasSize(planeW, planeH, width) {
  var w = width || 1600;
  return { width: w, height: Math.max(1, Math.round(w * planeH / planeW)) };
}

export function spineCanvasSize(planeW, planeH, height) {
  var h = height || 1800;
  return { width: Math.max(64, Math.round(h * planeW / planeH)), height: h };
}

export function imageCrop(destW, destH, imageW, imageH, ax, ay) {
  var scale = Math.max(destW / imageW, destH / imageH);
  var sw = destW / scale;
  var sh = destH / scale;
  var sx = (imageW - sw) * (ax == null ? 0.5 : ax);
  var sy = (imageH - sh) * (ay == null ? 0.42 : ay);
  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx > imageW - sw) sx = Math.max(0, imageW - sw);
  if (sy > imageH - sh) sy = Math.max(0, imageH - sh);
  return { sx: sx, sy: sy, sw: sw, sh: sh, scale: scale };
}

export function coverLayout(canvasW, canvasH, imageW, imageH, maxSideCrop) {
  var crop = maxSideCrop == null ? 0.08 : maxSideCrop;
  if (crop < 0) crop = 0;
  if (crop > 0.2) crop = 0.2;
  var aspect = imageW / imageH;
  var minTitle = Math.round(canvasH * 0.26);
  var maxArt = Math.max(1, canvasH - minTitle);
  var natural = canvasW / aspect;
  var tallest = natural / Math.max(0.5, 1 - crop * 2);
  var artH = natural < maxArt ? Math.min(maxArt, tallest, canvasH * 0.64) : maxArt;
  artH = Math.max(1, Math.round(artH));
  return {
    art: { x: 0, y: 0, w: canvasW, h: artH },
    source: imageCrop(canvasW, artH, imageW, imageH, 0.5, 0.42),
    title: {
      x: Math.round(canvasW * 0.07),
      y: artH,
      w: canvasW - Math.round(canvasW * 0.14),
      h: canvasH - artH
    }
  };
}

export function pageImageBand(pageW, pageH, imageW, imageH, textH) {
  var gap = Math.round(pageW * 0.038);
  var folio = Math.round(pageH * 0.058);
  var natural = pageW * (imageH / imageW);
  var tallest = natural / 0.8;
  var floor = Math.min(natural * 0.92, pageH * 0.42);
  var room = pageH - textH - gap - folio;
  var band = Math.min(tallest, Math.max(floor, room));
  if (band > room) band = Math.max(Math.round(pageH * 0.34), room);
  band = Math.max(1, Math.round(Math.min(band, pageH - folio - 40)));
  return { band: band, gap: gap, folio: folio, natural: Math.round(natural) };
}

function pageSignals(page) {
  var source = page || {};
  return {
    shot: String(source.shot || source.shotType || "").toLowerCase(),
    phase: String(source.phase || source.narrativePhase || "").toLowerCase(),
    intent: String(source.layoutIntent || "").toUpperCase()
  };
}

function preferredLayout(page, index, total) {
  var signal = pageSignals(page);
  var known = signal.shot || signal.phase || signal.intent;
  if (!known) {
    if (index === 0) return "full";
    if (total > 1 && index === total - 1) return "ending";
    return "above";
  }
  if (signal.phase === "resolution" || index === total - 1) return "ending";
  if (signal.shot === "close") return "beside";
  if (signal.shot === "establishing" || signal.phase === "setup" || index === 0) return "full";
  if (signal.shot === "reaction") return "spread";
  if (signal.shot === "high" || signal.shot === "action" || signal.phase === "setback" || signal.phase === "climax") return "large";
  if (signal.intent === "QUIET_PAGE" || signal.shot === "medium") return "text";
  return "above";
}

/** One layout per page. A spread is the only layout that is shared, and only
 * by the two pages of that opening. A quiet ending keeps its own page. */
export function choosePageLayouts(pages) {
  var list = pages || [];
  var chosen = list.map(function (page, index) {
    return preferredLayout(page, index, list.length);
  });
  for (var i = 0; i < chosen.length; i += 2) {
    var next = chosen[i + 1];
    if (!next) break;
    if ((chosen[i] === "spread" || next === "spread") && chosen[i] !== "ending" && next !== "ending") {
      chosen[i] = "spread";
      chosen[i + 1] = "spread";
    }
  }
  return chosen;
}

function contained(imageW, imageH, x, y, w, h) {
  var scale = Math.min(w / imageW, h / imageH);
  var dw = Math.round(imageW * scale);
  var dh = Math.round(imageH * scale);
  return {
    x: Math.round(x + (w - dw) / 2),
    y: Math.round(y + (h - dh) / 2),
    w: dw,
    h: dh
  };
}

/** Where the whole illustration and the type sit on one portrait page.
 * The picture keeps its own aspect. Text stays on the paper, off the picture. */
export function pageComposition(layout, pageW, pageH, imageW, imageH, side, textH) {
  var name = layout || "above";
  var aspect = imageW / Math.max(1, imageH);
  var folio = Math.round(pageH * 0.058);
  var gap = Math.round(pageH * 0.028);
  var top = Math.round(pageH * 0.045);
  var outer = Math.round(pageW * 0.06);
  var gutter = Math.round(pageW * 0.072);
  var left = side === "right" ? gutter : outer;
  var right = side === "left" ? gutter : outer;
  var copy = Math.max(0, textH || 0);
  var align = "left";
  var valign = "";
  var image;
  var text;

  if (name === "beside") {
    var textW = Math.round(pageW * 0.48);
    var slotW = pageW - textW - gap - outer - gutter;
    var naturalH = Math.round(slotW / aspect);
    var bodyTop = top;
    var bodyH = pageH - folio - bodyTop;
    var imgH = Math.min(naturalH, bodyH);
    var imgW = Math.round(imgH * aspect);
    var cluster = Math.max(imgH, Math.min(bodyH, Math.max(copy, Math.round(pageH * 0.2))));
    var clusterY = bodyTop + Math.max(0, Math.round((bodyH - cluster) / 2));
    var imgY = clusterY + Math.round((Math.min(cluster, bodyH) - imgH) / 2);
    if (side === "left") {
      image = contained(imageW, imageH, outer, imgY, imgW, imgH);
      text = { x: outer + imgW + gap, y: bodyTop, w: textW, h: bodyH };
    } else {
      text = { x: gutter, y: bodyTop, w: textW, h: bodyH };
      image = contained(imageW, imageH, gutter + textW + gap, imgY, imgW, imgH);
    }
    valign = "middle";
  } else if (name === "text") {
    var quietW = pageW - left - right;
    var plateW = Math.round(quietW * 0.74);
    var plateH = Math.round(plateW / aspect);
    image = contained(imageW, imageH, left + (quietW - plateW) / 2, top + Math.round(pageH * 0.03), plateW, plateH);
    text = {
      x: left,
      y: image.y + image.h + gap,
      w: quietW,
      h: pageH - folio - (image.y + image.h + gap)
    };
  } else if (name === "ending") {
    var margin = Math.round(pageW * 0.1);
    var endGutter = Math.round(pageW * 0.09);
    var endLeft = side === "right" ? endGutter : margin;
    var endRight = side === "left" ? endGutter : margin;
    var endW = pageW - endLeft - endRight;
    var endH = Math.round(endW / aspect);
    var room = pageH - folio - top;
    var used = Math.min(copy || Math.round(pageH * 0.2), Math.max(0, room - endH - gap));
    var stack = endH + gap + used;
    var start = top + Math.max(0, Math.round((room - stack) / 2));
    image = contained(imageW, imageH, endLeft, start, endW, endH);
    text = { x: endLeft, y: image.y + image.h + gap, w: endW, h: pageH - folio - (image.y + image.h + gap) };
    align = "center";
  } else if (name === "large" || name === "spread") {
    var wideGutter = name === "spread" ? Math.round(pageW * 0.1) : gutter;
    var wideOuter = name === "spread" ? Math.round(pageW * 0.046) : outer;
    var wideLeft = side === "right" ? wideGutter : wideOuter;
    var wideRight = side === "left" ? wideGutter : wideOuter;
    var wideW = pageW - wideLeft - wideRight;
    var wideH = Math.round(wideW / aspect);
    var pinned = name === "spread" ? Math.round(pageH * 0.05) : 0;
    var roomH = pageH - folio - (pinned || top);
    var usedCopy = Math.min(copy || Math.round(pageH * 0.18), Math.max(0, roomH - wideH - gap));
    var stackH = wideH + gap + usedCopy;
    var origin = pinned || (top + Math.max(0, Math.round((roomH - stackH) / 2)));
    image = contained(imageW, imageH, wideLeft, origin, wideW, wideH);
    text = { x: wideLeft, y: image.y + image.h + gap, w: wideW, h: pageH - folio - (image.y + image.h + gap) };
    align = "center";
  } else if (name === "full") {
    var fullLeft = side === "right" ? gutter : 0;
    var fullRight = side === "left" ? gutter : 0;
    var fullW = pageW - fullLeft - fullRight;
    var fullH = Math.round(fullW / aspect);
    image = contained(imageW, imageH, fullLeft, 0, fullW, fullH);
    var textLeft = Math.max(outer, fullLeft);
    var textRight = Math.max(outer, fullRight);
    text = { x: textLeft, y: image.y + image.h + gap, w: pageW - textLeft - textRight, h: pageH - folio - (image.y + image.h + gap) };
  } else {
    var bandW = pageW - left - right;
    var bandH = Math.round(bandW / aspect);
    image = contained(imageW, imageH, left, top, bandW, bandH);
    text = { x: left, y: image.y + image.h + gap, w: bandW, h: pageH - folio - (image.y + image.h + gap) };
  }

  if (text.y < image.y + image.h + 8 && !(name === "beside")) {
    text.y = image.y + image.h + gap;
    text.h = pageH - folio - text.y;
  }
  if (text.h < 1) text.h = 1;
  return { layout: name, image: image, text: text, align: align, valign: valign, folio: folio };
}
