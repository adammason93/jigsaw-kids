/* Loads the signed-in user's school once, then themes the portal.
   Personal accounts stay on normal Wondii. */
(function (global) {
  "use strict";

  var NAVY = "#141b4d";
  var INTENT_KEY = "wondii-account-intent";
  var INVITE_KEY = "wondii-org-invite";
  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var homeCopy = null;
  var state = {
    status: "loading",
    organisation: null,
    membership: null,
    starters: [],
    navigation: [],
    members: [],
    invites: [],
    notice: ""
  };
  var client = null;
  var listeners = [];

  function cfg() {
    return global.SCORE_SYNC || {};
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(snapshot()); } catch (e) {}
    });
    try { document.dispatchEvent(new CustomEvent("wondii-org")); } catch (e) {}
  }

  function snapshot() {
    var org = state.organisation;
    var role = state.membership ? state.membership.role : null;
    return {
      status: state.status,
      organisation: org,
      organisationId: org ? org.id : null,
      organisationName: org ? org.name : "",
      shortName: org ? org.short_name : "",
      logoUrl: org ? org.logo_url : "",
      primaryColour: org ? org.primary_colour : NAVY,
      secondaryColour: org ? org.secondary_colour || NAVY : NAVY,
      heroImageUrl: org ? org.hero_image_url : "",
      sidebarImageUrl: org ? org.sidebar_image_url : "",
      role: role,
      membership: state.membership,
      branding: org
        ? {
            name: org.name,
            shortName: org.short_name,
            logoUrl: org.logo_url,
            primaryColour: org.primary_colour,
            secondaryColour: org.secondary_colour || NAVY,
            heroImageUrl: org.hero_image_url,
            sidebarImageUrl: org.sidebar_image_url,
            portalTitle: org.portal_title || org.name,
            portalSubtitle: org.portal_subtitle || ""
          }
        : null,
      storyStarters: state.starters,
      customNavigation: state.navigation,
      canManage: role === "owner" || role === "school_admin"
    };
  }

  function hexByte(hex, i) {
    return parseInt(hex.slice(i, i + 2), 16) / 255;
  }

  function channel(c) {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length !== 6) return 0;
    var r = channel(hexByte(h, 0));
    var g = channel(hexByte(h, 2));
    var b = channel(hexByte(h, 4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    var L1 = luminance(a);
    var L2 = luminance(b);
    var hi = Math.max(L1, L2);
    var lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function contrastText(hex) {
    return contrast(hex, "#ffffff") >= 4.5 ? "#ffffff" : NAVY;
  }

  function colourWarning(hex) {
    if (contrast(hex, "#ffffff") < 3 && contrast(hex, NAVY) < 3) {
      return "That colour is hard to read. Pick a stronger one, or we’ll keep the label in navy.";
    }
    if (contrast(hex, "#ffffff") < 4.5) {
      return "White text wouldn’t be clear on this colour, so buttons will use navy text.";
    }
    return "";
  }

  function applyTheme() {
    var app = document.querySelector(".p-app");
    var org = state.organisation;
    var root = document.documentElement;
    document.body.classList.toggle("org-on", !!org);
    var names = ["--org-primary", "--org-on-primary", "--org-secondary", "--org-accent"];
    if (!org) {
      names.forEach(function (name) {
        root.style.removeProperty(name);
        if (app) app.style.removeProperty(name);
      });
      if (app) app.style.removeProperty("--org-surface");
      return;
    }
    var primary = org.primary_colour || NAVY;
    var onPrimary = contrastText(primary);
    root.style.setProperty("--org-primary", primary);
    root.style.setProperty("--org-on-primary", onPrimary);
    if (!app) return;
    app.style.setProperty("--org-primary", primary);
    app.style.setProperty("--org-on-primary", onPrimary);
    app.style.setProperty("--org-secondary", org.secondary_colour || NAVY);
    app.style.setProperty("--org-accent", primary);
    app.style.setProperty("--org-surface", "#fffdfb");
  }

  function rememberHome() {
    if (homeCopy) return;
    var hello = document.getElementById("helloTitle");
    var sub = document.getElementById("helloSub");
    var art = document.querySelector(".p-hello__art");
    if (!hello) return;
    homeCopy = {
      title: hello.innerHTML,
      sub: sub ? sub.textContent : "",
      art: art ? art.getAttribute("src") : ""
    };
  }

  function paint() {
    rememberHome();
    applyTheme();
    var view = snapshot();
    var lock = document.getElementById("orgLockup");
    var logo = document.getElementById("orgLogo");
    var name = document.getElementById("orgName");
    if (lock) lock.hidden = !view.organisation;
    if (view.organisation && logo) {
      if (view.logoUrl) {
        logo.hidden = false;
        logo.src = view.logoUrl;
        logo.alt = "";
      } else {
        logo.hidden = true;
        logo.removeAttribute("src");
      }
    }
    if (name && view.organisation) name.textContent = view.organisationName;
    var hello = document.getElementById("helloTitle");
    var sub = document.getElementById("helloSub");
    var art = document.querySelector(".p-hello__art");
    var helloBlock = document.querySelector(".p-hello");
    if (view.organisation && hello) {
      hello.textContent = "Welcome to " + (view.branding.portalTitle || view.organisationName);
    } else if (hello && homeCopy) {
      hello.innerHTML = homeCopy.title;
    }
    if (view.organisation && sub) {
      sub.textContent = view.branding.portalSubtitle || "What shall we make for your school today?";
    } else if (sub && homeCopy) {
      sub.textContent = homeCopy.sub;
    }
    if (art && view.heroImageUrl) art.src = view.heroImageUrl;
    else if (art && view.organisation) art.src = "games/images/schools/portal-hello.jpg";
    else if (art && homeCopy && homeCopy.art) art.src = homeCopy.art;
    if (helloBlock) helloBlock.classList.toggle("p-hello--school", !!view.organisation && !view.heroImageUrl);
    document.querySelectorAll(".p-who").forEach(function (chip) {
      chip.hidden = !!view.organisation;
    });
    var row = document.getElementById("orgCreateRow");
    if (row) row.hidden = !view.organisation;
    document.querySelectorAll("[data-org-open]").forEach(function (manage) {
      manage.hidden = !view.organisation;
    });
    var teacherNav = document.getElementById("teacherNav");
    if (teacherNav) teacherNav.hidden = !view.organisation;
    var teacherTabs = document.getElementById("teacherTabs");
    if (teacherTabs) teacherTabs.hidden = !view.organisation;
    var banner = document.getElementById("orgBanner");
    if (banner) {
      banner.hidden = !state.notice;
      banner.textContent = state.notice || "";
    }
    paintNav(view);
    paintStarters(view);
    var side = document.querySelector(".p-side");
    if (side) {
      if (view.sidebarImageUrl) side.style.setProperty("--org-side-image", 'url("' + view.sidebarImageUrl.replace(/"/g, "") + '")');
      else side.style.removeProperty("--org-side-image");
    }
    emit();
  }

  function paintNav(view) {
    var host = document.getElementById("orgNav");
    if (!host) return;
    host.replaceChildren();
    if (!view.organisation) return;
    view.customNavigation.forEach(function (item) {
      if (!item.is_active) return;
      if (!item.href || !/^(#|\.\/|games\/)/.test(item.href)) return;
      var a = document.createElement("a");
      a.className = "p-side__link";
      a.href = item.href;
      a.textContent = item.label;
      host.appendChild(a);
    });
  }

  function paintStarters(view) {
    var host = document.getElementById("orgStarters");
    if (!host) return;
    var activeStarters = view.storyStarters.filter(function (item) { return item.is_active; });
    host.hidden = !view.organisation || !activeStarters.length;
    var list = document.getElementById("orgStarterList");
    if (!list) return;
    list.replaceChildren();
    view.storyStarters.forEach(function (item) {
      if (!item.is_active) return;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "org-starter";
      btn.innerHTML = "<strong></strong><span></span>";
      btn.querySelector("strong").textContent = item.title;
      btn.querySelector("span").textContent = item.description || "";
      btn.addEventListener("click", function () {
        try {
          sessionStorage.setItem("wondii-org-starter", item.prompt_seed || item.title);
        } catch (e) {}
        global.location.href = "games/storybook.html";
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    var ideas = document.getElementById("orgIdeasTitle");
    if (ideas && view.organisation) ideas.textContent = "Ideas for " + (view.shortName || view.organisationName);
  }

  function finishBoot() {
    document.documentElement.classList.remove("org-pending");
  }

  function withClient(done) {
    if (client) {
      done(client);
      return;
    }
    function make() {
      var c = cfg();
      if (!global.supabase || !c.supabaseUrl || !c.supabaseAnonKey) {
        done(null);
        return;
      }
      client = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: global.localStorage }
      });
      client.auth.onAuthStateChange(function (event) {
        if (event === "SIGNED_OUT") {
          clearOrg();
          finishBoot();
          paint();
          var box = document.getElementById("orgOnboard");
          var panel = document.getElementById("orgSettings");
          if (box) box.hidden = true;
          if (panel) panel.hidden = true;
        }
        if (event === "SIGNED_IN") load();
      });
      done(client);
    }
    if (global.supabase && global.supabase.createClient) make();
    else {
      var s = document.createElement("script");
      s.src = LIB;
      s.onload = make;
      s.onerror = function () { done(null); };
      document.head.appendChild(s);
    }
  }

  function clearOrg() {
    state.organisation = null;
    state.membership = null;
    state.starters = [];
    state.navigation = [];
    state.members = [];
    state.invites = [];
    state.status = "ready";
  }

  function load(done) {
    return new Promise(function (resolve) {
      function finish() {
        finishBoot();
        paint();
        if (done) done();
        resolve(snapshot());
      }
      withClient(function (sb) {
        if (!sb) {
          clearOrg();
          finish();
          return;
        }
        sb.auth.getSession().then(function (res) {
          var session = res && res.data && res.data.session;
          if (!session) {
            clearOrg();
            finish();
            return;
          }
          document.documentElement.classList.add("org-pending");
          var email = session.user.email || "";
          var pending = "";
          try { pending = sessionStorage.getItem(INVITE_KEY) || ""; } catch (e) {}
          var accept = pending
            ? sb.rpc("accept_organisation_invite", { p_token: pending }).then(function (accepted) {
                try { sessionStorage.removeItem(INVITE_KEY); } catch (e2) {}
                if (accepted && accepted.error) {
                  state.notice = /email_mismatch/i.test(accepted.error.message || "")
                    ? "That invitation is for a different email address."
                    : "That invitation could not be used.";
                } else {
                  state.notice = "";
                }
              })
            : Promise.resolve();
          accept.then(function () {
            return sb.from("organisation_members").select("id, role, status, organisation_id, email, joined_at").eq("user_id", session.user.id).eq("status", "active");
          }).then(function (mem) {
            var rows = (mem && mem.data) || [];
            rows.sort(function (a, b) {
              return String(b.joined_at || "").localeCompare(String(a.joined_at || ""));
            });
            var row = rows[0];
            if (!row) {
              clearOrg();
              finish();
              maybeOnboard(email);
              return;
            }
            state.membership = row;
            return Promise.all([
              sb.from("organisations").select("id, name, short_name, slug, logo_url, primary_colour, secondary_colour, website_url, hero_image_url, sidebar_image_url, portal_title, portal_subtitle, is_active").eq("id", row.organisation_id).maybeSingle(),
              sb.from("organisation_story_starters").select("id, title, description, icon, prompt_seed, sort_order, is_active").eq("organisation_id", row.organisation_id).order("sort_order"),
              sb.from("organisation_navigation").select("id, label, icon, href, sort_order, is_active").eq("organisation_id", row.organisation_id).order("sort_order")
            ]).then(function (parts) {
              var org = parts[0].data || null;
              if (!org || org.is_active === false) {
                clearOrg();
                finish();
                return;
              }
              state.organisation = org;
              var canManage = row.role === "owner" || row.role === "school_admin";
              state.starters = ((parts[1] && parts[1].data) || []).filter(function (item) {
                return canManage || item.is_active;
              });
              state.navigation = ((parts[2] && parts[2].data) || []).filter(function (item) {
                return canManage || item.is_active;
              });
              state.status = "ready";
              finish();
            });
          }).catch(function () {
            clearOrg();
            finish();
            maybeOnboard(email);
          });
        });
      });
    });
  }

  function schoolIntentFor(email) {
    try {
      var raw = JSON.parse(localStorage.getItem(INTENT_KEY) || "null");
      return !!(raw && raw.intent === "school" && raw.email === String(email || "").toLowerCase());
    } catch (e) {
      return false;
    }
  }

  function maybeOnboard(email) {
    if (!schoolIntentFor(email) || state.organisation) return;
    var box = document.getElementById("orgOnboard");
    if (box) box.hidden = false;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error("no_file"));
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error("Use a PNG, JPEG or WebP logo."));
      if (file.size > 2 * 1024 * 1024) return reject(new Error("Logo must be under 2 MB."));
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var canvas = document.createElement("canvas");
        var scale = Math.min(1, 800 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        var colours = sampleColours(canvas);
        canvas.toBlob(function (blob) {
          resolve({ blob: blob || file, colours: colours, preview: canvas.toDataURL("image/webp", 0.9) });
        }, "image/webp", 0.9);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Couldn’t read that image."));
      };
      img.src = url;
    });
  }

  function sampleColours(canvas) {
    var ctx = canvas.getContext("2d");
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var buckets = {};
    var step = Math.max(4, Math.floor(data.length / 4 / 4000) * 4);
    for (var i = 0; i < data.length; i += step) {
      if (data[i + 3] < 200) continue;
      var r = data[i] - (data[i] % 24);
      var g = data[i + 1] - (data[i + 1] % 24);
      var b = data[i + 2] - (data[i + 2] % 24);
      var hex = "#" + [r, g, b].map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
      if (luminance(hex) > 0.9) continue;
      buckets[hex] = (buckets[hex] || 0) + 1;
    }
    return Object.keys(buckets).sort(function (a, b) { return buckets[b] - buckets[a]; }).slice(0, 3);
  }

  function uploadLogo(orgId, blob) {
    var path = orgId + "/branding/logo-" + Date.now() + ".webp";
    return client.storage.from("organisation_branding").upload(path, blob, { contentType: "image/webp", upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      return client.storage.from("organisation_branding").getPublicUrl(path).data.publicUrl;
    });
  }

  function createSchool(fields) {
    return client.rpc("create_organisation", {
      p_name: fields.name,
      p_short_name: fields.shortName || "",
      p_primary_colour: fields.colour,
      p_website: fields.website || ""
    }).then(function (res) {
      if (res.error) throw res.error;
      var org = res.data;
      if (Array.isArray(org)) org = org[0];
      if (!org || !org.id) throw new Error("Couldn’t create the school space.");
      var next = fields.logoBlob
        ? uploadLogo(org.id, fields.logoBlob).catch(function () { return ""; })
        : Promise.resolve("");
      return next.then(function (url) {
        var patch = { portal_title: org.name };
        if (url) patch.logo_url = url;
        return client.from("organisations").update(patch).eq("id", org.id).then(function (updated) {
          if (updated.error) throw updated.error;
          if (fields.starters && fields.starters.length) {
            return client.from("organisation_story_starters").insert(fields.starters.map(function (s, i) {
              return { organisation_id: org.id, title: s.title, description: s.description, prompt_seed: s.prompt, sort_order: i };
            }));
          }
        }).then(function () {
          try { localStorage.removeItem(INTENT_KEY); } catch (e) {}
          return load();
        });
      });
    });
  }

  function saveBrand(fields) {
    var org = state.organisation;
    if (!org) return Promise.reject(new Error("no_org"));
    var patch = {
      name: fields.name,
      short_name: fields.shortName || org.short_name,
      primary_colour: String(fields.colour || "").toLowerCase(),
      website_url: fields.website || null,
      portal_title: fields.name
    };
    var logo = fields.logoBlob ? uploadLogo(org.id, fields.logoBlob) : Promise.resolve(null);
    return logo.then(function (url) {
      if (url) patch.logo_url = url;
      if (!fields.heroBlob) return null;
      var path = org.id + "/branding/hero-" + Date.now() + ".webp";
      return client.storage.from("organisation_branding").upload(path, fields.heroBlob, { contentType: "image/webp", upsert: false }).then(function (res) {
        if (res.error) throw res.error;
        patch.hero_image_url = client.storage.from("organisation_branding").getPublicUrl(path).data.publicUrl;
      });
    }).then(function () {
      return client.from("organisations").update(patch).eq("id", org.id);
    }).then(function (res) {
      if (res.error) throw res.error;
      return load();
    });
  }

  function loadTeam() {
    var org = state.organisation;
    if (!org) return Promise.resolve();
    return Promise.all([
      client.from("organisation_members").select("id, email, role, status").eq("organisation_id", org.id).order("joined_at"),
      client.from("organisation_invites").select("id, email, role, status").eq("organisation_id", org.id).eq("status", "invited")
    ]).then(function (parts) {
      state.members = (parts[0] && parts[0].data) || [];
      state.invites = (parts[1] && parts[1].data) || [];
      paintTeam();
    });
  }

  function paintTeam() {
    var list = document.getElementById("orgTeamList");
    if (!list) return;
    list.replaceChildren();
    state.members.forEach(function (m) { list.appendChild(teamRow(m, false)); });
    state.invites.forEach(function (m) { list.appendChild(teamRow(m, true)); });
  }

  function teamRow(m, invited) {
    var li = document.createElement("li");
    var who = document.createElement("div");
    who.innerHTML = "<strong></strong><span></span>";
    who.querySelector("strong").textContent = m.email || "Member";
    who.querySelector("span").textContent = (invited ? "Invited · " : "") + roleLabel(m.role);
    li.appendChild(who);
    if (snapshot().canManage) {
      var actions = document.createElement("div");
      if (!invited && m.role !== "owner") {
        var role = document.createElement("select");
        ["teacher", "staff", "school_admin"].forEach(function (value) {
          var opt = document.createElement("option");
          opt.value = value;
          opt.textContent = roleLabel(value);
          if (value === m.role) opt.selected = true;
          role.appendChild(opt);
        });
        role.addEventListener("change", function () {
          client.rpc("set_organisation_member_role", { p_member: m.id, p_role: role.value }).then(loadTeam);
        });
        var remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          client.rpc("remove_organisation_member", { p_member: m.id }).then(function (res) {
            if (res.error) window.alert("The last owner has to stay, or pass the school to someone else first.");
            else loadTeam();
          });
        });
        actions.appendChild(role);
        actions.appendChild(remove);
      }
      if (invited) {
        var resend = document.createElement("button");
        resend.type = "button";
        resend.textContent = "Resend invite";
        resend.addEventListener("click", function () {
          client.rpc("create_organisation_invite", {
            p_org: state.organisation.id,
            p_email: m.email,
            p_role: m.role
          }).then(function (res) {
            var note = document.getElementById("orgInviteNote");
            if (res.error) {
              if (note) note.textContent = "Couldn’t resend that invite.";
              return;
            }
            showInviteLink(res.data, m.email, note);
          });
        });
        var revoke = document.createElement("button");
        revoke.type = "button";
        revoke.textContent = "Cancel invite";
        revoke.addEventListener("click", function () {
          client.rpc("revoke_organisation_invite", { p_invite: m.id }).then(loadTeam);
        });
        actions.appendChild(resend);
        actions.appendChild(revoke);
      }
      li.appendChild(actions);
    }
    return li;
  }

  function roleLabel(role) {
    if (role === "owner" || role === "school_admin") return "School admin";
    if (role === "staff") return "Staff";
    return "Teacher";
  }

  function bind() {
    var params;
    try { params = new URLSearchParams(global.location.search); } catch (e) { params = null; }
    if (params && params.get("invite")) {
      try { sessionStorage.setItem(INVITE_KEY, params.get("invite")); } catch (e2) {}
    }
    var form = document.getElementById("orgOnboardForm");
    if (form) form.addEventListener("submit", onCreate);
    var file = document.getElementById("orgLogoFile");
    if (file) file.addEventListener("change", onLogoPick);
    ["orgColour", "orgSettingsColour", "orgSchoolName", "orgSettingsName"].forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.addEventListener("input", previewColour);
    });
    var save = document.getElementById("orgSave");
    if (save) save.addEventListener("click", onSave);
    var invite = document.getElementById("orgInviteForm");
    if (invite) invite.addEventListener("submit", onInvite);
    var starterForm = document.getElementById("orgStarterForm");
    if (starterForm) starterForm.addEventListener("submit", onAddStarter);
    var navForm = document.getElementById("orgNavForm");
    if (navForm) navForm.addEventListener("submit", onAddNav);
    var helloInvite = document.getElementById("orgHelloInvite");
    if (helloInvite) helloInvite.addEventListener("click", function () {
      var hi = document.getElementById("orgHello");
      var panel = document.getElementById("orgSettings");
      if (hi) hi.hidden = true;
      if (panel) {
        panel.hidden = false;
        fillSettings();
        loadTeam();
      }
    });
    var panel = document.getElementById("orgSettings");
    document.querySelectorAll("[data-org-open]").forEach(function (manage) {
      manage.addEventListener("click", function () {
        if (!panel) return;
        panel.hidden = false;
        fillSettings();
        loadTeam();
      });
    });
    var close = document.getElementById("orgSettingsClose");
    if (close && panel) close.addEventListener("click", function () { panel.hidden = true; });
    document.querySelectorAll("[data-org-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showStep(Number(btn.getAttribute("data-org-step")));
        previewColour();
      });
    });
  }

  var picked = null;

  function onLogoPick(e) {
    var file = e.target.files && e.target.files[0];
    readFile(file).then(function (result) {
      picked = result;
      var img = document.getElementById("orgLogoPreview");
      if (img) {
        img.hidden = false;
        img.src = result.preview;
      }
      var previewLogo = document.getElementById("orgPreviewLogo");
      if (previewLogo) {
        previewLogo.hidden = false;
        previewLogo.src = result.preview;
      }
      var suggest = document.getElementById("orgSuggestLabel");
      var host = document.getElementById("orgSwatches");
      if (suggest) suggest.hidden = !result.colours.length;
      if (host) {
        host.replaceChildren();
        result.colours.forEach(function (hex) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "org-swatch";
          b.style.background = hex;
          b.title = hex;
          b.addEventListener("click", function () {
            var input = document.getElementById("orgColour");
            if (input) input.value = hex;
            previewColour();
          });
          host.appendChild(b);
        });
      }
      previewColour();
    }).catch(function (err) {
      var note = document.getElementById("orgOnboardNote");
      if (note) note.textContent = err.message || "Couldn’t use that logo.";
    });
  }

  function previewColour(e) {
    var onboard = document.getElementById("orgColour");
    var settingsColour = document.getElementById("orgSettingsColour");
    var onboardHex = (onboard && onboard.value) || NAVY;
    var settingsHex = (settingsColour && settingsColour.value) || onboardHex;
    var preview = document.getElementById("orgPreviewCta");
    var name = document.getElementById("orgPreviewName");
    var school = document.getElementById("orgSchoolName");
    var schoolName = (school && school.value) || "Your school";
    if (name) name.textContent = schoolName;
    var title = document.getElementById("orgPreviewTitle");
    if (title) title.textContent = schoolName;
    if (preview) {
      preview.style.background = onboardHex;
      preview.style.color = contrastText(onboardHex);
    }
    var note = document.getElementById("orgColourNote");
    if (note) note.textContent = colourWarning(onboardHex);
    var settingsPreview = document.getElementById("orgSettingsCta");
    if (settingsPreview) {
      settingsPreview.style.background = settingsHex;
      settingsPreview.style.color = contrastText(settingsHex);
    }
    var settingsName = document.getElementById("orgSettingsPreviewName");
    var settingsSchool = document.getElementById("orgSettingsName");
    if (settingsName && settingsSchool && settingsSchool.value) settingsName.textContent = settingsSchool.value;
    if (e && e.target && e.target.id === "orgSettingsColour") {
      var settingsNote = document.getElementById("orgSettingsNote");
      if (settingsNote) settingsNote.textContent = colourWarning(settingsHex);
    }
  }

  function showStep(n) {
    document.querySelectorAll(".org-step").forEach(function (el) {
      el.hidden = Number(el.getAttribute("data-step")) !== n;
    });
  }

  function normaliseWebsite(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try {
      var url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:" || !url.hostname || url.hostname.indexOf(".") === -1) return null;
      return url.href;
    } catch (err) {
      return null;
    }
  }

  function schoolError(err) {
    var msg = (err && (err.message || err.error_description || err.details)) || "";
    if (/not_authenticated|permission denied|jwt/i.test(msg)) return "Your login expired. Log in again, then create the school.";
    if (/invalid_colour/i.test(msg)) return "Pick a school colour and try again.";
    if (/duplicate|unique|slug/i.test(msg)) return "That school name is already in use. Add the place name and try again.";
    if (/failed to fetch|network/i.test(msg)) return "Couldn’t reach Wondii. Check your connection and try again.";
    return msg || "Couldn’t create the school space.";
  }

  function onCreate(e) {
    if (e) e.preventDefault();
    showStep(3);
    var nameEl = document.getElementById("orgSchoolName");
    var colourEl = document.getElementById("orgColour");
    var websiteEl = document.getElementById("orgWebsite");
    var note = document.getElementById("orgOnboardNote");
    var button = document.querySelector("#orgOnboardForm button[type='submit']");
    var name = nameEl ? nameEl.value.trim() : "";
    var website = normaliseWebsite(websiteEl ? websiteEl.value : "");
    if (name.length < 2) {
      showStep(1);
      if (note) note.textContent = "Add the school name.";
      if (nameEl) nameEl.focus();
      return;
    }
    if (website === null) {
      if (note) note.textContent = "That website doesn’t look right. Leave it blank, or use something like www.school.example.";
      if (websiteEl) websiteEl.focus();
      return;
    }
    if (!client) {
      if (note) note.textContent = "Still connecting. Wait a moment, then try again.";
      return;
    }
    if (note) note.textContent = "Creating your school space…";
    if (button) button.disabled = true;
    var starters = [];
    document.querySelectorAll("[data-starter]:checked").forEach(function (box) {
      starters.push({
        title: box.getAttribute("data-title"),
        description: box.getAttribute("data-description"),
        prompt: box.getAttribute("data-prompt")
      });
    });
    createSchool({
      name: name,
      colour: String((colourEl && colourEl.value) || NAVY).toLowerCase(),
      website: website,
      logoBlob: picked && picked.blob,
      starters: starters
    }).then(function () {
      var box = document.getElementById("orgOnboard");
      if (box) box.hidden = true;
      var hi = document.getElementById("orgHello");
      if (hi) {
        hi.hidden = false;
        var t = document.getElementById("orgHelloTitle");
        if (t) t.textContent = "Welcome to Wondii, " + name.replace(/ primary school/i, "") + "!";
      }
    }).catch(function (err) {
      if (button) button.disabled = false;
      if (note) note.textContent = schoolError(err);
    });
  }

  function paintConfig() {
    var starters = document.getElementById("orgStarterAdmin");
    var nav = document.getElementById("orgNavAdmin");
    if (starters) {
      starters.replaceChildren();
      state.starters.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item.title + (item.is_active ? "" : " (hidden)");
        var remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          client.from("organisation_story_starters").delete().eq("id", item.id).then(function () { load(); });
        });
        li.appendChild(remove);
        starters.appendChild(li);
      });
    }
    if (nav) {
      nav.replaceChildren();
      state.navigation.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item.label;
        var remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          client.from("organisation_navigation").delete().eq("id", item.id).then(function () { load(); });
        });
        li.appendChild(remove);
        nav.appendChild(li);
      });
    }
  }

  function onAddStarter(e) {
    e.preventDefault();
    var org = state.organisation;
    if (!org) return;
    var title = document.getElementById("orgStarterTitle").value.trim();
    var description = document.getElementById("orgStarterDesc").value.trim();
    var prompt = document.getElementById("orgStarterPrompt").value.trim();
    if (!title) return;
    client.from("organisation_story_starters").insert({
      organisation_id: org.id,
      title: title,
      description: description,
      prompt_seed: prompt || title,
      sort_order: state.starters.length
    }).then(function () {
      e.target.reset();
      return load();
    }).then(paintConfig);
  }

  function onAddNav(e) {
    e.preventDefault();
    var org = state.organisation;
    if (!org) return;
    var label = document.getElementById("orgNavLabel").value.trim();
    var href = document.getElementById("orgNavHref").value.trim();
    var note = document.getElementById("orgNavNote");
    if (!label || !/^(#|\.\/|games\/)/.test(href)) {
      if (note) note.textContent = "Links need to start with #, ./ or games/.";
      return;
    }
    client.from("organisation_navigation").insert({
      organisation_id: org.id,
      label: label,
      href: href,
      sort_order: state.navigation.length
    }).then(function (res) {
      if (res.error) {
        if (note) note.textContent = "Couldn’t add that link.";
        return;
      }
      e.target.reset();
      if (note) note.textContent = "";
      return load().then(paintConfig);
    });
  }

  function fillSettings() {
    var org = state.organisation;
    if (!org) return;
    var manage = snapshot().canManage;
    document.querySelectorAll("[data-org-admin]").forEach(function (el) {
      el.hidden = !manage;
    });
    ["orgSettingsName", "orgSettingsColour", "orgSettingsSite", "orgSettingsFile"].forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.disabled = !manage;
    });
    var save = document.getElementById("orgSave");
    if (save) save.hidden = !manage;
    var name = document.getElementById("orgSettingsName");
    var colour = document.getElementById("orgSettingsColour");
    var site = document.getElementById("orgSettingsSite");
    var logo = document.getElementById("orgSettingsLogo");
    if (name) name.value = org.name;
    if (colour) colour.value = org.primary_colour;
    if (site) site.value = org.website_url || "";
    if (logo && org.logo_url) {
      logo.hidden = false;
      logo.src = org.logo_url;
    }
    var shortName = document.getElementById("orgSettingsShort");
    if (shortName) {
      shortName.value = org.short_name || "";
      shortName.disabled = !manage;
    }
    previewColour();
    paintConfig();
  }

  function onSave() {
    var note = document.getElementById("orgSettingsNote");
    var file = document.getElementById("orgSettingsFile");
    var chosen = file && file.files && file.files[0];
    var go = function (blob, heroBlob) {
      var shortEl = document.getElementById("orgSettingsShort");
      saveBrand({
        name: document.getElementById("orgSettingsName").value.trim(),
        shortName: shortEl ? shortEl.value.trim() : "",
        colour: document.getElementById("orgSettingsColour").value,
        website: document.getElementById("orgSettingsSite").value.trim(),
        logoBlob: blob,
        heroBlob: heroBlob
      }).then(function () {
        if (note) note.textContent = "Saved.";
        fillSettings();
      }).catch(function (err) {
        if (note) note.textContent = (err && err.message) || "Couldn’t save.";
      });
    };
    var hero = document.getElementById("orgHeroFile");
    var heroFile = hero && hero.files && hero.files[0];
    var ready = chosen
      ? readFile(chosen).then(function (r) { return r.blob; })
      : Promise.resolve(null);
    ready.then(function (blob) {
      if (!heroFile) {
        go(blob, null);
        return;
      }
      return readFile(heroFile).then(function (r) {
        go(blob, r.blob);
      });
    }).catch(function (err) {
      if (note) note.textContent = err.message || "Couldn’t use that image.";
    });
  }

  function showInviteLink(token, email, note) {
    var school = state.organisation ? state.organisation.name : "our school";
    var link = global.location.origin + "/portal.html?invite=" + token;
    if (note) {
      note.replaceChildren();
      note.appendChild(document.createTextNode("Invitation ready. Share this link — it only works for " + email + ". "));
      var mail = document.createElement("a");
      mail.href = "mailto:" + email + "?subject=" + encodeURIComponent("Join " + school + " on Wondii") + "&body=" + encodeURIComponent("Join " + school + " on Wondii:\n" + link);
      mail.textContent = "Email the link";
      note.appendChild(mail);
    }
    try { navigator.clipboard.writeText(link); } catch (err) {}
  }

  function onInvite(e) {
    e.preventDefault();
    var email = document.getElementById("orgInviteEmail").value.trim();
    var role = document.getElementById("orgInviteRole").value;
    var note = document.getElementById("orgInviteNote");
    client.rpc("create_organisation_invite", { p_org: state.organisation.id, p_email: email, p_role: role }).then(function (res) {
      if (res.error) {
        if (note) note.textContent = "Couldn’t create that invite.";
        return;
      }
      showInviteLink(res.data, email, note);
      e.target.reset();
      loadTeam();
    });
  }

  global.WondiiOrg = {
    get: snapshot,
    subscribe: function (fn) { listeners.push(fn); },
    refresh: load,
    contrastText: contrastText
  };

  bind();
  load();
})(window);
