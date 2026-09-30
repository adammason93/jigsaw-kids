/* Portal login and sign-up. Each account keeps its own characters and books. */
(function () {
  "use strict";

  var root = document.documentElement;
  var gate = document.getElementById("portalGate");
  var form = document.getElementById("gateForm");
  var email = document.getElementById("gateEmail");
  var pass = document.getElementById("gatePassword");
  var show = document.getElementById("gateShow");
  var btn = document.getElementById("gateBtn");
  var status = document.getElementById("gateStatus");
  var title = document.getElementById("gateTitle");
  var lead = document.getElementById("gateLead");
  var tabLogin = document.getElementById("gateTabLogin");
  var tabRegister = document.getElementById("gateTabRegister");
  var cloud = window.KidsScoreCloud;
  var mode = "login";

  if (!gate || !form || !cloud || !cloud.isConfigured || !cloud.isConfigured()) {
    root.classList.remove("gate-on");
    return;
  }

  function wantsSignup() {
    try {
      return /(?:^|[?&])signup=1(?:&|$)/.test(window.location.search);
    } catch (e) {
      return false;
    }
  }

  function setStatus(msg, isError) {
    status.textContent = msg || "";
    status.classList.toggle("is-error", !!isError);
  }

  function applyMode(next) {
    mode = next === "signup" ? "signup" : "login";
    var signingUp = mode === "signup";
    title.textContent = signingUp ? "Create your Wondii account" : "Log in to Wondii";
    lead.textContent = signingUp
      ? "Choose how you’ll use Wondii, then create the account."
      : "Enter your email and password to open the games, stories and characters.";
    var intentBox = document.getElementById("gateIntent");
    if (intentBox) intentBox.hidden = !signingUp;
    btn.textContent = signingUp ? "Create account" : "Log in";
    if (tabLogin) {
      tabLogin.classList.toggle("is-on", !signingUp);
      tabLogin.setAttribute("aria-selected", signingUp ? "false" : "true");
    }
    if (tabRegister) {
      tabRegister.classList.toggle("is-on", signingUp);
      tabRegister.setAttribute("aria-selected", signingUp ? "true" : "false");
    }
    if (email) email.autocomplete = signingUp ? "email" : "username";
    if (pass) pass.autocomplete = signingUp ? "new-password" : "current-password";
    setStatus("");
  }

  function openGate() {
    root.classList.add("gate-on");
    applyMode(wantsSignup() ? "signup" : mode);
    setTimeout(function () {
      if (email) email.focus();
    }, 50);
  }

  function closeGate() {
    root.classList.remove("gate-on");
    if (wantsSignup() && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "portal.html");
    }
  }

  if (wantsSignup()) {
    root.classList.add("gate-on");
    applyMode("signup");
  }

  if (root.classList.contains("gate-on")) {
    openGate();
    if (wantsSignup()) {
      cloud.getSession(function (session) {
        var carryOn = document.getElementById("gateContinue");
        if (carryOn) carryOn.hidden = !session;
      });
    }
  } else if (navigator.onLine !== false) {
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

  if (show && pass) {
    show.addEventListener("change", function () {
      pass.type = show.checked ? "text" : "password";
    });
  }

  if (tabLogin) {
    tabLogin.addEventListener("click", function () {
      applyMode("login");
      if (email) email.focus();
    });
  }
  if (tabRegister) {
    tabRegister.addEventListener("click", function () {
      applyMode("signup");
      if (email) email.focus();
    });
  }
  var carryOn = document.getElementById("gateContinue");
  if (carryOn) {
    carryOn.addEventListener("click", function () {
      closeGate();
    });
  }

  function failMessage(err) {
    var m = String((err && err.message) || err || "");
    if (/already_registered|already registered|already been registered/i.test(m)) {
      return "That email already has an account. Log in instead.";
    }
    if (/invalid/i.test(m) && mode === "login") return "That email or password isn’t right — try again.";
    if (/password/i.test(m) && /weak|short|least/i.test(m)) return "Use a password of at least 6 characters.";
    if (/email/i.test(m) && /invalid|valid/i.test(m)) return "Enter a valid email address.";
    if (/sync_unavailable|fetch|network/i.test(m)) return "Couldn’t reach the server — check your internet and try again.";
    return m || (mode === "signup" ? "Couldn’t create the account — try again." : "Couldn’t log in — try again.");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var addr = String((email && email.value) || "").trim();
    var pwd = String((pass && pass.value) || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setStatus("Enter a valid email address.", true);
      if (email) email.focus();
      return;
    }
    if (pwd.length < 6) {
      setStatus("Use a password of at least 6 characters.", true);
      if (pass) pass.focus();
      return;
    }
    mode = tabRegister && tabRegister.getAttribute("aria-selected") === "true" ? "signup" : "login";
    var signingUp = mode === "signup";
    btn.disabled = true;
    setStatus(mode === "signup" ? "Creating your account…" : "Logging in…");
    var done = false;
    var wait = setTimeout(function () {
      if (done) return;
      done = true;
      btn.disabled = false;
      setStatus("Couldn’t reach the server — check your internet and try again.", true);
    }, 15000);

    function finish(err, result) {
      if (done) return;
      done = true;
      clearTimeout(wait);
      btn.disabled = false;
      if (err) {
        setStatus(failMessage(err), true);
        return;
      }
      if (result && result.needsConfirm) {
        applyMode("login");
        setStatus("Account created. Check your email to confirm it, then log in here.");
        return;
      }
      var created = result && result.email ? String(result.email).toLowerCase() : "";
      if (signingUp && created && created !== addr.toLowerCase()) {
        setStatus("That didn’t create a new account. Try a different email.", true);
        return;
      }
      if (pass) pass.value = "";
      setStatus("");
      closeGate();
    }

    if (signingUp) {
      var picked = document.querySelector('input[name="wondiiIntent"]:checked');
      try {
        localStorage.setItem("wondii-account-intent", JSON.stringify({
          email: addr.toLowerCase(),
          intent: picked && picked.value === "school" ? "school" : "family"
        }));
      } catch (intentErr) {}
      var startSignup = function () { cloud.signUp(addr, pwd, finish); };
      if (cloud.signOut) cloud.signOut(startSignup);
      else startSignup();
    } else {
      cloud.signInWithEmail(addr, pwd, function (err) {
        finish(err, null);
      });
    }
  });
})();
