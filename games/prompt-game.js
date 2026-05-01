(function () {
  "use strict";

  function cfg() {
    return typeof window.SCORE_CONFIG !== "undefined"
      ? window.SCORE_CONFIG
      : typeof window.SCORE_SYNC !== "undefined"
        ? window.SCORE_SYNC
        : {};
  }

  function gameMakerSlug(c) {
    var def = "game-maker";
    if (!c || !c.gameMakerEdgeSlug) return def;
    var s = String(c.gameMakerEdgeSlug).trim().replace(/^\/+|\/+$/g, "");
    if (!s) return def;
    var safe = s.replace(/[^a-zA-Z0-9\-_]/g, "");
    return safe || def;
  }

  function supabaseBase() {
    var c = cfg();
    return c && c.supabaseUrl ? String(c.supabaseUrl).replace(/\/$/, "") : "";
  }

  function anonKey() {
    var c = cfg();
    return c && c.supabaseAnonKey ? String(c.supabaseAnonKey) : "";
  }

  function gameMakerUrl() {
    var base = supabaseBase();
    if (!base) return "";
    return base + "/functions/v1/" + gameMakerSlug(cfg());
  }

  var promptEl = document.getElementById("promptGameInput");
  var btn = document.getElementById("promptGameCreate");
  var btnClear = document.getElementById("promptGameClear");
  var statusEl = document.getElementById("promptGameStatus");
  var wrapEl = document.getElementById("promptGameFrameWrap");
  var frameEl = document.getElementById("promptGameFrame");

  function setStatus(msg, isErr) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("prompt-game-status--err", !!isErr);
  }

  function setLoading(on) {
    if (btn) {
      btn.disabled = !!on;
      btn.textContent = on ? "Creating…" : "Create my game";
    }
  }

  async function createGame() {
    var url = gameMakerUrl();
    var key = anonKey();
    if (!url || !key) {
      setStatus(
        "Missing Supabase URL or anon key in score-config.js — ask a grown-up to check.",
        true
      );
      return;
    }
    var prompt = promptEl ? String(promptEl.value || "").trim() : "";
    if (prompt.length < 8) {
      setStatus("Type a longer idea (at least a few words).", true);
      return;
    }

    setLoading(true);
    setStatus("Asking the game maker to build your 3D game…");
    if (wrapEl) wrapEl.hidden = true;

    try {
      var res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          apikey: key,
        },
        body: JSON.stringify({ prompt: prompt }),
      });
      var data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }
      if (!res.ok) {
        var detail =
          (data && (data.detail || data.code || data.error)) || res.statusText;
        setStatus("Could not make the game: " + detail + " (" + res.status + ").", true);
        return;
      }
      var html = data && data.html ? String(data.html) : "";
      if (!html) {
        setStatus("The game maker returned an empty game. Try a simpler idea.", true);
        return;
      }
      if (frameEl) {
        frameEl.srcdoc = html;
        frameEl.setAttribute("sandbox", "allow-scripts");
      }
      if (wrapEl) wrapEl.hidden = false;
      setStatus("Ready! Play below. Tap Create again for a new game from your words.");
    } catch (e) {
      setStatus(
        "Network error: " + (e && e.message ? e.message : "try again"),
        true
      );
    } finally {
      setLoading(false);
    }
  }

  function clearFrame() {
    if (frameEl) {
      frameEl.srcdoc = "";
      frameEl.removeAttribute("srcdoc");
    }
    if (wrapEl) wrapEl.hidden = true;
    setStatus("");
  }

  if (btn) btn.addEventListener("click", createGame);
  if (btnClear) btnClear.addEventListener("click", clearFrame);
})();
