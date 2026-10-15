/* Plans how a picture book is composed before its pages are painted.
   It does not draw, animate, or generate pictures. Books with no plan
   keep the reader's existing page layouts. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiArtDirection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SCHEMA = "wondii-art-direction/2";
  var LAYOUTS = ["full-bleed", "cinematic", "half", "two-thirds", "beside", "quiet", "text-led", "action", "ending", "spread"];
  var IMAGE_USD = 0.039657;
  var VISION_USD = 0.001472;
  var GBP_PER_USD = 0.754;
  var IMPACT = /\b(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!/g;
  var ACCENT = {
    "magical-adventure": "#143d4f",
    funny: "#8a3412",
    bedtime: "#3d4550",
    educational: "#1e3a5f",
    mystery: "#2c2140",
    story: "#2a241c"
  };

  function textOf(page) {
    return String(page && (page.text || page.prose) || "");
  }

  function phaseOf(page) {
    return String(page && (page.phase || page.narrativePhase) || "").toLowerCase();
  }

  function shotOf(page) {
    return String(page && (page.shot || page.shotType) || "").toLowerCase();
  }

  function intentOf(page) {
    return String(page && page.layoutIntent || "").toUpperCase();
  }

  function pagesOf(record) {
    return ((record && record.pages) || []).map(function (page, index) {
      return {
        number: index + 1,
        text: textOf(page),
        phase: phaseOf(page),
        shot: shotOf(page),
        intent: intentOf(page),
        image: String(page && (page.imageUrlFallback || page.image || "") || ""),
        continuousImage: !!(page && page.continuousImage),
        characters: (page && page.charactersPresent) || [],
        objects: (page && page.entitiesRequired) || [],
        emotion: String(page && page.emotion || "")
      };
    });
  }

  function count(blob, pattern) {
    return (String(blob).match(pattern) || []).length;
  }

  function identityFrom(record) {
    var pages = pagesOf(record);
    var blob = pages.map(function (page) { return page.text; }).join("\n");
    var lower = blob.toLowerCase();
    var phases = pages.map(function (page) { return page.phase; });
    var laughs = count(lower, /\b(laugh|laughed|giggle|giggled|silly)\b/g);
    var whispers = count(lower, /\bwhisper/g);
    var explains = count(lower, /\b(explained|because|learn|learned)\b/g);
    var clues = count(lower, /\b(clue|mystery|suspect)\b/g);
    var adventure = phases.some(function (phase) {
      return phase === "discovery" || phase === "setback" || phase === "climax" || phase === "escalation";
    });
    var tone = String(record && (record.tone || (record.request && record.request.tone)) || "").toLowerCase();
    var personality = "story";
    var because = "The pages do not yet show a stronger genre.";
    if (tone === "bedtime" || tone === "gentle") {
      personality = "bedtime";
      because = "The request asks for a gentle reading.";
    } else if (tone === "funny" || tone === "humour" || tone === "humor" || (laughs >= 3 && !adventure)) {
      personality = "funny";
      because = laughs >= 3 ? "The story laughs often enough to lead the design." : "The request asks for a funny story.";
    } else if (tone === "mystery" || (clues >= 1 && !adventure)) {
      personality = "mystery";
      because = "The story is built around a clue.";
    } else if (tone === "educational" || tone === "learning" || (explains >= 2 && !adventure)) {
      personality = "educational";
      because = "The story stops to explain.";
    } else if (adventure || tone === "adventure") {
      personality = "magical-adventure";
      because = "Discovery, trouble, and a climax ask for a cinematic pace, with a quieter ending where the story resolves.";
    } else if (whispers || phases.indexOf("resolution") >= 0) {
      personality = "bedtime";
      because = "The story spends its time on a quiet ending.";
    }
    var pacing = {
      "magical-adventure": "cinematic",
      funny: "playful",
      bedtime: "calm",
      educational: "clear",
      mystery: "atmospheric",
      story: "measured"
    }[personality];
    return {
      personality: personality,
      tone: tone || personality,
      ageBand: String(record && (record.ageBand || (record.request && record.request.ageBand)) || ""),
      pacing: pacing,
      accent: ACCENT[personality] || ACCENT.story,
      reason: because
    };
  }

  function quotesIn(text) {
    var found = [];
    var re = /"[^"]+"/g;
    var match;
    while ((match = re.exec(text))) found.push(match[0]);
    return found;
  }

  function sentencesOf(text) {
    return String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  }

  function wordCount(sentence) {
    return String(sentence).trim().split(/\s+/).filter(Boolean).length;
  }

  function treatmentsFor(page, personality) {
    var text = page.text;
    var marks = [];
    var seen = {};
    function add(kind, phrase, reason) {
      var exact = String(phrase || "");
      if (!exact || text.indexOf(exact) < 0 || seen[exact]) return;
      if (kind === "impact" && !/^(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!$/i.test(exact)) return;
      seen[exact] = true;
      marks.push({ kind: kind, text: exact, reason: reason });
    }
    if (personality !== "educational") {
      (String(text).match(IMPACT) || []).forEach(function (word) {
        add("impact", word, "This sound is already in the approved sentence.");
      });
    }
    var whispered = /\bwhispered?\b/i.test(text);
    quotesIn(text).forEach(function (quote) {
      var inner = quote.slice(1, -1);
      if (whispered && personality !== "funny") {
        add("whisper", quote, "The narration says this is whispered.");
        return;
      }
      if (/!$/.test(inner) && personality !== "bedtime") {
        add("spoken", quote, "A short exclamation can sit apart from the narration.");
        return;
      }
      if ((page.phase === "discovery" || page.phase === "commitment") && personality !== "funny") {
        add("magic", quote, "This spoken line is a discovery, so the type stays elegant rather than loud.");
        return;
      }
      if (personality === "bedtime" || page.phase === "resolution") {
        add("whisper", quote, "The ending keeps speech soft.");
        return;
      }
      add("dialogue", quote, "Spoken words stay distinct from the narration.");
    });
    if (personality === "bedtime") return marks;
    sentencesOf(text).forEach(function (sentence, index, all) {
      var trimmed = sentence.trim();
      if (seen[trimmed] || trimmed.charAt(0) === "\"") return;
      if (wordCount(trimmed) <= 2 && !/\b(laugh|laughed|said)\b/i.test(trimmed) && page.phase !== "resolution") {
        if (personality === "bedtime" || personality === "educational") {
          add("pause", trimmed, "A short sentence holds the beat before the story continues.");
        } else {
          add("motion", trimmed, "A sudden short sentence changes scale, without a box around it.");
        }
      } else if (index === all.length - 1 && /^Then\b/.test(trimmed) && (page.phase === "escalation" || page.phase === "setback")) {
        add("pause", trimmed, "The turn of the scene gets room before it.");
      }
    });
    if (page.phase === "resolution") {
      var last = sentencesOf(text).pop();
      if (last) add("quiet", last.trim(), "The last sentence stays quiet.");
    }
    return marks;
  }

  function layoutRole(page, index, total, personality) {
    var scenic = personality === "magical-adventure" || personality === "mystery";
    if (index === total - 1 || page.phase === "resolution") return "ending";
    if (page.intent === "QUIET_PAGE") return "quiet";
    if (page.shot === "close") return scenic ? "cinematic" : "beside";
    if (index === 0 || page.shot === "establishing") return "full-bleed";
    if (page.phase === "climax") return "action";
    if (page.phase === "setback") return "cinematic";
    if (page.shot === "reveal") return "half";
    if (page.shot === "overhead") return scenic ? "full-bleed" : "two-thirds";
    if (page.shot === "reaction") return "full-bleed";
    if (page.phase === "commitment" && page.shot === "low") return "text-led";
    if (page.phase === "escalation" && page.shot === "low") return "half";
    if (page.shot === "action" && page.phase === "attempt") return "action";
    if (page.shot === "action") return "half";
    if (page.shot === "vignette") return "ending";
    return "half";
  }

  function alternate(layout) {
    var next = {
      "full-bleed": "cinematic",
      cinematic: "half",
      half: "cinematic",
      "two-thirds": "cinematic",
      beside: "quiet",
      quiet: "text-led",
      "text-led": "half",
      action: "cinematic",
      ending: "quiet",
      spread: "cinematic"
    };
    return next[layout] || "half";
  }

  function promptNote(layout, half) {
    if (layout === "spread") {
      return "Paint one continuous scene across both open pages, at 2:1. Keep faces, hands, and important objects out of the centre fold. Leave a quiet area on each page for type. Do not split this into two unrelated pictures.";
    }
    var notes = {
      "full-bleed": "Compose a 2:3 portrait that can run to the outer edge. Keep faces away from the inner edge. Leave the lower part as open sky, water, or ground for type.",
      cinematic: "Compose a wide scene for the upper half of a portrait page. Keep the action out of the gutter and leave room below for a paragraph. A 3:2 painting fits this; a 2:3 painting can come closer to the page.",
      half: "Use about half the page for the scene, at 3:2. Leave the rest quiet for the words. Do not letter the picture.",
      "two-thirds": "Compose a 2:3 scene for about two thirds of a portrait page, with a short clear area for type.",
      beside: "Place the subject toward the outer side so words can sit beside the picture. Keep faces out of that text column. A 3:2 painting is enough.",
      quiet: "A smaller, calmer 3:2 scene with empty space around it.",
      "text-led": "A supporting 3:2 scene, smaller than the facing picture. Leave most of the page for the words, including one line that can be set larger. Do not letter the picture.",
      action: "Paint a 3:2 scene that supports one short sentence. Leave clear paper so that sentence can be set much larger than the narration. Do not fill the page.",
      ending: "A quiet 2:3 closing scene under the words, with room to set the last sentence on its own."
    };
    return (notes[layout] || notes.half) + (half ? " This page is the " + half + " half of one continuous painting." : "");
  }

  function pagePlan(page, layout, personality) {
    var spread = layout === "spread";
    var align = layout === "quiet" || layout === "ending" || layout === "text-led" || layout === "action" || page.placeBelow ? "center" : "left";
    return {
      number: page.number,
      layout: layout,
      placement: layout === "ending" || page.placeBelow ? "below" : (layout === "beside" ? "outer" : "top"),
      aspect: layout === "spread" ? "2:1" : (layout === "full-bleed" || layout === "two-thirds" || layout === "ending" ? "2:3" : "3:2"),
      fullBleed: layout === "full-bleed" || spread,
      doublePage: spread,
      continuous: spread,
      half: page.half || "",
      textPlacement: layout === "beside" ? "beside" : (layout === "ending" || page.placeBelow ? "above" : "below"),
      textAlign: align,
      treatments: treatmentsFor(page, personality),
      safeText: { region: layout === "beside" ? "beside-illustration" : (layout === "ending" || page.placeBelow ? "above-illustration" : "below-illustration"), gutter: "clear" },
      focal: { anchorX: 0.5, anchorY: 0.4, characters: page.characters.slice() },
      objects: page.objects.slice(),
      gutter: { inset: 0.08, faces: "away-from-fold" },
      crop: { maxSide: layout === "full-bleed" || layout === "two-thirds" ? 0.16 : (layout === "cinematic" ? 0.12 : 0.08) },
      background: "paper",
      edge: layout === "beside" || layout === "quiet" ? "feather" : (layout === "full-bleed" || spread ? "bleed" : "inset"),
      readingOrder: layout === "ending" || page.placeBelow ? ["story", "illustration", "folio"] : ["illustration", "story", "folio"],
      accessibility: { minSizeRatio: 0.03, contrast: "ink-on-paper", motion: "none" },
      accent: ACCENT[personality] || ACCENT.story,
      promptNote: promptNote(layout, page.half),
      reason: page.reason || ""
    };
  }

  function samePicture(left, right) {
    return !!(left && right && left.image && left.image === right.image);
  }

  function pictureQuote() {
    var usd = Math.round((IMAGE_USD + VISION_USD) * 1000000) / 1000000;
    return {
      estimateUsd: usd,
      estimateGbp: Math.round(usd * GBP_PER_USD * 10000) / 10000
    };
  }

  function artworkRequests(pages, roles) {
    var requests = [];
    function add(item) {
      requests.push(Object.assign({
        status: "needs-new",
        replaces: false,
        supplements: true,
        references: ["games/images/characters/maya-v1.jpg", "games/images/characters/crew/wondii-leo.jpg"],
        characters: ["maya-v1", "leo"]
      }, pictureQuote(), item));
    }
    for (var i = 0; i < pages.length; i += 2) {
      var left = pages[i];
      var right = pages[i + 1];
      if (!left || !right || samePicture(left, right)) continue;
      if (left.shot === "reaction" && right.phase === "escalation") {
        add({
          id: "spread-" + left.number + "-" + right.number,
          pages: [left.number, right.number],
          role: "spread",
          aspect: "2:1",
          required: true,
          reason: "These two saved pictures are different scenes. A cinematic spread has to be painted as one 2:1 image, with faces and words kept out of the centre fold. The existing pictures stay until that painting is approved."
        });
      }
      if (left.shot === "establishing" && right.shot === "reveal") {
        add({
          id: "opening-" + left.number + "-" + right.number,
          pages: [left.number, right.number],
          role: "integrated-spread",
          aspect: "2:1",
          required: false,
          reason: "The opening pictures are separate places. Water, mist, or leaves that continue from the first page onto the second have to be painted for the open spread. They cannot be drawn over these photographs."
        });
      }
    }
    pages.forEach(function (page, index) {
      if (page.shot === "overhead" && roles[index] === "full-bleed") {
        add({
          id: "portrait-" + page.number,
          pages: [page.number],
          role: "portrait-bleed",
          aspect: "2:3",
          required: false,
          reason: "The saved boat picture is a wide photograph. It cannot fill a portrait page or run past its rectangle without cropping past the safe limit. A 2:3 painting can carry the boat toward the outer edge and leave paper for the words."
        });
      }
      if (page.shot === "close") {
        add({
          id: "close-" + page.number,
          pages: [page.number],
          role: "portrait-close",
          aspect: "2:3",
          required: false,
          reason: "The saved close-up is a wide photograph, so it can only occupy the upper part of the page. A 2:3 painting with open water or foliage around the children would let the words sit in the scene."
        });
      }
    });
    return requests;
  }

  function directBook(record) {
    var source = record || {};
    var pages = pagesOf(source);
    var identity = identityFrom(source);
    var roles = pages.map(function (page, index) {
      return layoutRole(page, index, pages.length, identity.personality);
    });
    pages.forEach(function (page, index) {
      var partner = pages[index + 1];
      if (index % 2 || !samePicture(page, partner)) return;
      if (page.intent !== "DOUBLE_PAGE_SPREAD" && !page.continuousImage) return;
      roles[index] = "spread";
      roles[index + 1] = "spread";
      page.half = "left";
      partner.half = "right";
    });
    roles.forEach(function (role, index) {
      if (!index || role === "ending" || role === "spread" || role === "quiet" || role === "beside") return;
      if (role === roles[index - 1]) roles[index] = alternate(role);
    });
    pages.forEach(function (page, index) {
      var previous = roles[index - 1];
      page.placeBelow = roles[index] === "half" && index % 2 === 1 && page.phase === "escalation" && (previous === "full-bleed" || previous === "cinematic");
    });
    var limitations = [];
    var plans = [];
    pages.forEach(function (page, index) {
      var layout = roles[index];
      var partner = index % 2 === 0 ? pages[index + 1] : pages[index - 1];
      if (page.intent === "DOUBLE_PAGE_SPREAD" && !samePicture(page, partner)) {
        limitations.push("Page " + page.number + " asks for a double-page spread, but its picture is a separate scene, so it stays on its own page.");
        if (partner && partner.phase === "resolution") {
          limitations.push("Page " + page.number + " stays separate from the ending, so the last spread can slow down.");
        }
        if (layout === "spread") layout = "cinematic";
      }
      page.reason = layout + " from " + (page.shot || "the scene") + " / " + (page.phase || "the beat");
      plans.push(pagePlan(page, layout, identity.personality));
    });
    if (!pages.some(function (page) { return page.image && pages.some(function (other) { return other !== page && other.image === page.image; }); })) {
      limitations.push("These pictures were painted as separate pages. A continuous double-page scene needs one wide painting made for the open book.");
    }
    limitations.push("These pictures include their own backgrounds. A character standing on the paper needs transparent artwork made for that page.");
    var spreads = [];
    for (var i = 0; i < plans.length; i += 2) {
      var left = plans[i];
      var right = plans[i + 1];
      var relationship = "paired";
      if (left && right && left.layout !== right.layout) relationship = "asymmetric";
      if (left && left.layout === "ending" || right && right.layout === "ending" || left && left.layout === "quiet") relationship = "quiet";
      if (left && right && left.continuous && right.continuous) relationship = "continuous";
      spreads.push({
        pages: [left ? left.number : 0, right ? right.number : 0],
        relationship: relationship,
        continuous: !!(left && right && left.continuous && right.continuous),
        reason: relationship === "continuous" ? "One painting crosses the fold." : "Each page keeps its own picture."
      });
    }
    var requests = artworkRequests(pages, roles);
    var requiredUsd = 0;
    var requiredGbp = 0;
    var allUsd = 0;
    var allGbp = 0;
    requests.forEach(function (item) {
      allUsd += item.estimateUsd;
      allGbp += item.estimateGbp;
      if (item.required) {
        requiredUsd += item.estimateUsd;
        requiredGbp += item.estimateGbp;
      }
    });
    return {
      schema: SCHEMA,
      bookId: String(source.id || ""),
      identity: identity,
      spreads: spreads,
      pages: plans,
      artworkRequests: requests,
      artworkCost: {
        currencyNote: "One new picture plus one vision check, using the measured Rain That Rose average. A repair adds the same amount again. Nothing here is generated until it is approved.",
        requiredUsd: Math.round(requiredUsd * 1000000) / 1000000,
        requiredGbp: Math.round(requiredGbp * 10000) / 10000,
        withSupplementsUsd: Math.round(allUsd * 1000000) / 1000000,
        withSupplementsGbp: Math.round(allGbp * 10000) / 10000
      },
      limitations: limitations.filter(function (item, index, list) { return list.indexOf(item) === index; })
    };
  }

  function attachPlan(showcase, plan) {
    var copy = JSON.parse(JSON.stringify(showcase || {}));
    var request = plan && plan.request || {};
    if (request.ageBand) copy.ageBand = request.ageBand;
    if (request.tone) copy.tone = request.tone;
    (copy.pages || []).forEach(function (page, index) {
      var src = plan && plan.pages && plan.pages[index];
      if (!src || String(src.prose || "") !== String(page.text || "")) return;
      page.charactersPresent = src.charactersPresent || [];
      page.entitiesRequired = src.entitiesRequired || [];
      page.emotion = src.emotion || "";
    });
    return copy;
  }

  function margins(pageW, pageH, side) {
    var folio = Math.round(pageH * 0.058);
    var outer = Math.round(pageW * 0.055);
    var gutter = Math.round(pageW * 0.08);
    var top = Math.round(pageH * 0.045);
    var gap = Math.round(pageH * 0.028);
    return {
      folio: folio,
      outer: outer,
      gutter: gutter,
      top: top,
      gap: gap,
      left: side === "right" ? gutter : outer,
      right: side === "left" ? gutter : outer
    };
  }

  function contain(imageW, imageH, x, y, w, h) {
    var scale = Math.min(w / imageW, h / imageH);
    var dw = imageW * scale;
    var dh = imageH * scale;
    return {
      x: Math.round(x + (w - dw) / 2),
      y: Math.round(y + (h - dh) / 2),
      w: Math.round(dw),
      h: Math.round(dh),
      sx: 0,
      sy: 0,
      sw: imageW,
      sh: imageH,
      crop: 0
    };
  }

  function cover(imageW, imageH, x, y, w, h, maxCrop, ax, ay) {
    var aspect = imageW / imageH;
    var dest = w / h;
    var crop = dest < aspect ? 1 - dest / aspect : 1 - aspect / dest;
    if (crop > maxCrop) {
      if (dest < aspect) h = w / (aspect * (1 - maxCrop));
      else w = h * (aspect * (1 - maxCrop));
      crop = maxCrop;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    var scale = Math.max(w / imageW, h / imageH);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (imageW - sw) * (ax == null ? 0.5 : ax);
    var sy = (imageH - sh) * (ay == null ? 0.4 : ay);
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx > imageW - sw) sx = Math.max(0, imageW - sw);
    if (sy > imageH - sh) sy = Math.max(0, imageH - sh);
    return { x: Math.round(x), y: Math.round(y), w: w, h: h, sx: sx, sy: sy, sw: sw, sh: sh, crop: crop };
  }

  function compose(direction, pageW, pageH, imageW, imageH, side, copyH) {
    var spec = direction || {};
    var layout = LAYOUTS.indexOf(spec.layout) >= 0 ? spec.layout : "half";
    var box = margins(pageW, pageH, side);
    var contentW = pageW - box.left - box.right;
    var aspect = imageW / imageH;
    var maxCrop = spec.crop && spec.crop.maxSide != null ? spec.crop.maxSide : 0.16;
    if (maxCrop > 0.16) maxCrop = 0.16;
    var image;
    var text;
    var align = spec.textAlign || "left";
    var feather = spec.edge === "feather";
    var cropLimited = false;

    if (layout === "spread" && spec.continuous) {
      var halfW = imageW / 2;
      var maxH = Math.round(pageH * 0.62);
      var spreadW = pageW;
      var spreadH = Math.round(spreadW / (halfW / imageH));
      var sy = 0;
      var sh = imageH;
      if (spreadH > maxH) {
        spreadH = maxH;
        sh = spreadH * (halfW / spreadW);
        if (sh < imageH * (1 - maxCrop)) sh = imageH * (1 - maxCrop);
        spreadH = Math.round(sh * (spreadW / halfW));
        sy = (imageH - sh) * 0.4;
      }
      image = {
        x: 0,
        y: 0,
        w: spreadW,
        h: spreadH,
        sx: spec.half === "right" ? halfW : 0,
        sy: sy,
        sw: halfW,
        sh: sh,
        crop: 1 - sh / imageH
      };
      var textLeft = side === "right" ? box.gutter : box.outer;
      var textRight = side === "left" ? box.gutter : box.outer;
      text = {
        x: textLeft,
        y: image.y + image.h + box.gap,
        w: pageW - textLeft - textRight,
        h: pageH - box.folio - (image.y + image.h + box.gap)
      };
    } else if (layout === "beside") {
      var textW = Math.round(contentW * 0.64);
      var slot = contentW - textW - box.gap;
      var band = Math.round(slot / aspect);
      var bodyH = pageH - box.folio - box.top;
      if (band > bodyH * 0.46) band = Math.round(bodyH * 0.46);
      var imgY = box.top;
      if (side === "left") {
        image = contain(imageW, imageH, box.left, imgY, slot, band);
        text = { x: box.left + slot + box.gap, y: box.top, w: textW, h: bodyH };
      } else {
        text = { x: box.left, y: box.top, w: textW, h: bodyH };
        image = contain(imageW, imageH, box.left + textW + box.gap, imgY, slot, band);
      }
      if (copyH > 0 && copyH < bodyH * 0.78) {
        var cluster = Math.max(image.h, copyH);
        var shift = Math.max(0, Math.round((bodyH - cluster) / 2));
        image.y += shift;
        text.y += shift;
        text.h = Math.max(copyH, image.h);
      }
    } else if (layout === "ending") {
      var used = copyH > 0 ? copyH : Math.round(pageH * 0.34);
      text = { x: box.left, y: box.top, w: contentW, h: used };
      var endW = Math.round(contentW * 0.86);
      var endH = Math.round(endW / aspect);
      var room = pageH - box.folio - (text.y + text.h + box.gap);
      if (endH > room) {
        endH = Math.max(1, room);
        endW = Math.round(endH * aspect);
      }
      image = contain(imageW, imageH, box.left + (contentW - endW) / 2, text.y + text.h + box.gap, endW, endH);
      align = "center";
    } else if (spec.placement === "below") {
      var usedBelow = copyH > 0 ? copyH : Math.round(pageH * 0.36);
      var floorImg = Math.round(pageH * 0.22);
      var maxText = pageH - box.folio - box.top - box.gap - floorImg;
      if (usedBelow > maxText) usedBelow = Math.max(1, maxText);
      text = { x: box.left, y: box.top, w: contentW, h: usedBelow };
      var belowW = Math.round(contentW * 0.9);
      var belowH = Math.round(belowW / aspect);
      var room = pageH - box.folio - (text.y + text.h + box.gap);
      if (belowH > room) {
        belowH = Math.max(1, room);
        belowW = Math.round(belowH * aspect);
        if (belowW > contentW) {
          belowW = contentW;
          belowH = Math.round(belowW / aspect);
        }
      }
      image = contain(imageW, imageH, box.left + Math.round((contentW - belowW) / 2), text.y + text.h + box.gap, belowW, belowH);
      align = "center";
    } else {
      var fraction = layout === "full-bleed" || layout === "two-thirds" ? 0.62 : (layout === "cinematic" ? 0.52 : (layout === "quiet" ? 0.34 : (layout === "text-led" ? 0.3 : (layout === "action" ? 0.38 : 0.42))));
      var bleed = layout === "full-bleed";
      var imgX = bleed ? (side === "right" ? box.gutter : 0) : box.left;
      var imgW = bleed ? pageW - box.gutter : (layout === "quiet" ? Math.round(contentW * 0.72) : (layout === "text-led" ? Math.round(contentW * 0.64) : (layout === "action" ? Math.round(contentW * 0.8) : contentW)));
      if (!bleed && (layout === "quiet" || layout === "text-led" || layout === "action")) imgX = box.left + Math.round((contentW - imgW) / 2);
      var want = Math.round(pageH * fraction);
      var natural = Math.round(imgW / aspect);
      if (layout === "full-bleed" || layout === "cinematic" || layout === "two-thirds") {
        image = cover(imageW, imageH, imgX, bleed ? 0 : box.top, imgW, Math.max(natural, want), maxCrop, 0.5, 0.4);
        if (image.crop >= maxCrop - 0.001 && image.h + 1 < want) cropLimited = true;
      } else {
        image = contain(imageW, imageH, imgX, box.top + (layout === "quiet" ? Math.round(pageH * 0.04) : 0), imgW, natural);
      }
      if (copyH > 0 && image.y + image.h + box.gap + copyH > pageH - box.folio && image.h > pageH * 0.28) {
        var fitH = pageH - box.folio - image.y - box.gap - copyH;
        if (fitH < pageH * 0.28) fitH = Math.round(pageH * 0.28);
        var fitW = Math.round(fitH * (image.w / image.h));
        var fitX = bleed ? (side === "right" ? pageW - box.gutter - fitW : 0) : imgX + (imgW - fitW) / 2;
        image = contain(imageW, imageH, fitX, image.y, fitW, fitH);
        cropLimited = true;
      }
      var copyX = Math.max(box.outer, box.left);
      var copyRight = Math.max(box.outer, box.right);
      text = {
        x: copyX,
        y: image.y + image.h + box.gap,
        w: pageW - copyX - copyRight,
        h: pageH - box.folio - (image.y + image.h + box.gap)
      };
      if (copyH > 0 && !bleed) {
        var block = image.h + box.gap + copyH;
        var room = pageH - box.folio - box.top;
        if (block < room * 0.82) {
          var shift = Math.round((room - block) / 2);
          image.y += shift;
          text.y += shift;
          text.h = copyH;
        }
      }
      if (layout === "quiet" || layout === "text-led" || layout === "action") align = "center";
    }

    if (text.h < 1) text.h = 1;
    if (text.y < image.y + image.h && layout !== "beside" && layout !== "ending" && spec.placement !== "below") {
      text.y = image.y + image.h + box.gap;
      text.h = Math.max(1, pageH - box.folio - text.y);
    }
    return {
      layout: layout,
      image: image,
      text: text,
      align: align,
      feather: feather,
      radius: feather ? Math.round(Math.min(image.w, image.h) * 0.06) : 0,
      folio: box.folio,
      gutter: box.gutter,
      cropLimited: cropLimited,
      fraction: image.h / pageH
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
  }

  function estimateHeight(copy, width, size) {
    var chars = String(copy || "").trim().length || 1;
    var perLine = Math.max(8, Math.floor(width / (size * 0.5)));
    return Math.ceil(chars / perLine) * size * 1.55;
  }

  function checkBook(record, direction) {
    var issues = [];
    var art = direction || {};
    if (art.schema !== "wondii-art-direction/1" && art.schema !== "wondii-art-direction/2") issues.push("schema");
    var pages = pagesOf(record);
    (art.pages || []).forEach(function (planned, index) {
      var source = pages[index];
      if (!source) {
        issues.push("extra-page");
        return;
      }
      if (LAYOUTS.indexOf(planned.layout) < 0) issues.push("layout:" + planned.number);
      (planned.treatments || []).forEach(function (mark) {
        if (!mark.text || source.text.indexOf(mark.text) < 0) issues.push("span:" + planned.number);
        if (mark.kind === "impact" && !/^(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!$/i.test(mark.text)) issues.push("invented-sound:" + planned.number);
      });
      if (planned.continuous && source.image) {
        var partner = index % 2 === 0 ? pages[index + 1] : pages[index - 1];
        if (!partner || partner.image !== source.image) issues.push("split-unrelated:" + planned.number);
      }
      var side = index % 2 ? "right" : "left";
      var needed = estimateHeight(source.text, 1000, 36);
      var placed = compose(planned, 1200, 1800, 1536, 1024, side, needed);
      if (overlaps(placed.image, placed.text)) issues.push("overlap:" + planned.number);
      if (placed.image.x < -1 || placed.image.y < -1 || placed.image.x + placed.image.w > 1201 || placed.image.y + placed.image.h > 1801) issues.push("crop-outside:" + planned.number);
      if (placed.image.crop > 0.1601) issues.push("crop:" + planned.number);
      var drawn = placed.image.w / placed.image.h;
      var sourceAspect = placed.image.sw / placed.image.sh;
      if (Math.abs(drawn - sourceAspect) > 0.04) issues.push("distort:" + planned.number);
      var gutter = placed.gutter;
      if (side === "left" && placed.text.x + placed.text.w > 1200 - gutter + 2) issues.push("gutter-text:" + planned.number);
      if (side === "right" && placed.text.x < gutter - 2) issues.push("gutter-text:" + planned.number);
      if (placed.text.h < 80) issues.push("text-room:" + planned.number);
      if (planned.accessibility && planned.accessibility.minSizeRatio < 0.03) issues.push("type-size:" + planned.number);
      var anchor = planned.continuous ? (index % 2 ? 1536 * 0.75 : 1536 * 0.25) : 1536 / 2;
      if (placed.image.sx > anchor || placed.image.sx + placed.image.sw < anchor) issues.push("focal:" + planned.number);
      if (!planned.readingOrder || planned.readingOrder[planned.readingOrder.length - 1] !== "folio") issues.push("order:" + planned.number);
    });
    (art.pages || []).forEach(function (planned, index) {
      if (!index) return;
      if (planned.layout === art.pages[index - 1].layout && planned.layout !== "spread" && planned.layout !== "ending") {
        issues.push("repeat:" + planned.number);
      }
    });
    return { ok: issues.length === 0, issues: issues };
  }

  return {
    SCHEMA: SCHEMA,
    LAYOUTS: LAYOUTS,
    identityFrom: identityFrom,
    directBook: directBook,
    attachPlan: attachPlan,
    compose: compose,
    checkBook: checkBook,
    promptNote: promptNote
  };
});
