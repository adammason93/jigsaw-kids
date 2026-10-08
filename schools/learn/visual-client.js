/*
 * Shows artwork that belongs to the saved adventure.
 * A missing picture uses the branded backdrop. Older lessons without
 * artwork keep the existing player.
 */
(function () {
  var manifest = null;

  function escape(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }

  function assets() {
    return (manifest && manifest.assets) || [];
  }

  function active() {
    return assets().length > 0;
  }

  function assetForSlide(slide) {
    var found = null;
    var id = slide && slide.visualAssetId;
    assets().forEach(function (asset) {
      if (id && asset.id === id) found = asset;
    });
    if (found) return found;
    var title = (slide && (slide.kicker || slide.title)) || "";
    assets().forEach(function (asset) {
      if ((asset.usedByScenes || []).indexOf(title) >= 0) found = asset;
    });
    return found;
  }

  function forSlide(slide) {
    if (!active()) return null;
    var asset = assetForSlide(slide);
    if (!asset) return { url: "", fallback: true, safe: "" };
    var regions = [];
    var adventure = globalThis.WondiiVisualAdventure;
    if (asset.characterRegions && adventure && adventure.reliableRegions) regions = adventure.reliableRegions(asset.characterRegions);
    if (asset.status === "ready" && asset.publicUrl) {
      var shown = { url: asset.publicUrl, fallback: false, safe: asset.uiSafeArea || "", characterRegions: regions };
      // Patch 6: a frame label ("Story picture: ...", "Teaching picture: ...") travels with the asset.
      if (asset.frameLabel) shown.tag = String(asset.frameLabel);
      return shown;
    }
    return { url: "", fallback: true, safe: asset.uiSafeArea || "", characterRegions: regions };
  }

  function bind(list) {
    manifest = { assets: Array.isArray(list) ? list : [] };
  }

  function reviewHtml(draft) {
    var list = (draft && draft.visualAssets) || assets();
    if (!list.length) return "";
    var cards = list.map(function (asset) {
      var caption = (asset.usedByScenes && asset.usedByScenes[0]) || asset.id;
      var state = asset.status === "ready" ? "Ready" : "Using the Wondii backdrop";
      var picture = asset.status === "ready" && asset.publicUrl
        ? "<img src=\"" + escape(asset.publicUrl) + "\" alt=\"\" />"
        : "<div class=\"lesson-world--fallback\" style=\"aspect-ratio:16/9\"></div>";
      return "<figure>" + picture + "<figcaption>" + escape(caption) + " · " + escape(state) + "</figcaption></figure>";
    }).join("");
    return "<p><strong>World.</strong></p><div class=\"creator-world\">" + cards + "</div>";
  }

  var api = { active: active, forSlide: forSlide, reviewHtml: reviewHtml, bind: bind };
  if (typeof globalThis !== "undefined") globalThis.WondiiVisuals = api;
})();
