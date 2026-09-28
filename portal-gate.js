/* Portal login screen: the Game Room opens only for a signed-in family (same account as ⚙️ Sync). */
(function () {
  "use strict";

  var root = document.documentElement;
  var gate = document.getElementById("portalGate");
  var form = document.getElementById("gateForm");
  var pass = document.getElementById("gatePassword");
  var show = document.getElementById("gateShow");
  var btn = document.getElementById("gateBtn");
  var status = document.getElementById("gateStatus");
  var cloud = window.KidsScoreCloud;
  if (!gate || !form || !cloud || !cloud.isConfigured || !cloud.isConfigured()) {
    root.classList.remove("gate-on");
    return;
  }

  function openGate() {
    root.classList.add("gate-on");
    setTimeout(function () {
      if (pass) pass.focus();
    }, 50);
  }

  function closeGate() {
    root.classList.remove("gate-on");
  }

  function setStatus(msg, isError) {
    status.textContent = msg || "";
    status.classList.toggle("is-error", !!isError);
  }

  if (root.classList.contains("gate-on")) {
    openGate();
  } else if (navigator.onLine !== false) {
    /* A saved sign-in exists — confirm it is still valid, but never lock out when offline or the check can't finish. */
    var settled = false;
    var timer = setTimeout(function () {
      settled = true;
    }, 8000);
    cloud.getSession(function (session, err) {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      if (!session && !err && navigator.onLine !== false) openGate();
    });
  }

  if (show) {
    show.addEventListener("change", function () {
      pass.type = show.checked ? "text" : "password";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var pwd = String(pass.value || "");
    if (pwd.length < 6) {
      setStatus("Enter the family password (at least 6 characters).", true);
      pass.focus();
      return;
    }
    btn.disabled = true;
    setStatus("Logging in…");
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      btn.disabled = false;
      setStatus("Couldn’t reach the server — check your internet and try again.", true);
    }, 15000);
    cloud.signIn(pwd, function (err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      btn.disabled = false;
      if (err) {
        var m = String((err && err.message) || "");
        if (/invalid/i.test(m)) setStatus("That password isn’t right — try again.", true);
        else if (/sync_unavailable|fetch|network/i.test(m)) setStatus("Couldn’t reach the server — check your internet and try again.", true);
        else setStatus(m || "Couldn’t log in — try again.", true);
        pass.select();
        return;
      }
      pass.value = "";
      setStatus("");
      closeGate();
    });
  });
})();
