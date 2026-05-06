/**
 * My Characters page — upload a photo (or describe a buddy), generate a
 * 3D-clay cartoon via clever-service, then save to Supabase characters_room.
 */
(function () {
  "use strict";

  var MAX_PHOTO_BYTES = 1_200_000; // mirrors clever-service MAX_HERO_REFERENCE_BYTES
  var MAX_DIMENSION = 1024;

  var els = {
    grid: document.getElementById("chGrid"),
    status: document.getElementById("chStatus"),
    addBtn: document.getElementById("chAddBtn"),
    signedOut: document.getElementById("chSignedOut"),
    modal: document.getElementById("chModal"),
    modalClose: document.getElementById("chModalClose"),
    modalError: document.getElementById("chModalError"),
    nameInput: document.getElementById("chName"),
    typeOpts: document.querySelectorAll(".ch-type-opt"),
    photoInput: document.getElementById("chPhotoInput"),
    photoPickBtn: document.getElementById("chPhotoPickBtn"),
    photoPreview: document.getElementById("chPhotoPreview"),
    photoLabel: document.getElementById("chPhotoLabel"),
    photoHint: document.getElementById("chPhotoHint"),
    busy: document.getElementById("chBusy"),
    result: document.getElementById("chResult"),
    resultImg: document.getElementById("chResultImg"),
    cancelBtn: document.getElementById("chCancelBtn"),
    retryBtn: document.getElementById("chRetryBtn"),
    generateBtn: document.getElementById("chGenerateBtn"),
    saveBtn: document.getElementById("chSaveBtn"),
  };

  var state = {
    type: "hero",
    photoDataUrl: null, // compressed JPEG data URL ready to send
    generatedDataUrl: null, // raw PNG data URL from edge function
    busy: false,
  };

  function setStatus(text, kind) {
    els.status.textContent = text || "";
    els.status.dataset.kind = kind || "";
  }

  function setModalError(msg) {
    if (!msg) {
      els.modalError.hidden = true;
      els.modalError.textContent = "";
      return;
    }
    els.modalError.hidden = false;
    els.modalError.textContent = msg;
  }

  function functionUrl() {
    var c = window.SCORE_CONFIG || window.SCORE_SYNC || {};
    var base = c.supabaseUrl ? String(c.supabaseUrl).replace(/\/$/, "") : "";
    if (!base) return "";
    var slug = c.storybookEdgeSlug
      ? String(c.storybookEdgeSlug).replace(/[^a-zA-Z0-9\-_]/g, "")
      : "clever-service";
    return base + "/functions/v1/" + (slug || "clever-service");
  }

  function fnAuthHeaders() {
    var c = window.SCORE_CONFIG || window.SCORE_SYNC || {};
    var key = c.supabaseAnonKey || "";
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      apikey: key,
    };
  }

  function compressImageFile(file, cb) {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      cb(new Error("Photo must be JPEG, PNG, or WebP."));
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
        var cw = Math.round(w * scale);
        var ch = Math.round(h * scale);
        var canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        var quality = 0.85;
        var dataUrl = canvas.toDataURL("image/jpeg", quality);
        // Re-shrink if the result is still too large
        while (dataUrl.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.45) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        cb(null, dataUrl);
      };
      img.onerror = function () {
        cb(new Error("Could not read this image."));
      };
      img.src = String(reader.result);
    };
    reader.onerror = function () {
      cb(new Error("Could not read this file."));
    };
    reader.readAsDataURL(file);
  }

  function setType(type) {
    state.type = type;
    Array.prototype.forEach.call(els.typeOpts, function (btn) {
      var isActive = btn.dataset.type === type;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (type === "buddy") {
      els.photoLabel.textContent = "Reference image (optional)";
      els.photoHint.textContent =
        "Upload a drawing or photo of your buddy if you have one — or skip it and we'll dream them up from the name.";
    } else {
      els.photoLabel.textContent = "Reference photo";
      els.photoHint.textContent =
        "A clear face photo works best. JPEG/PNG/WebP, up to ~1.2 MB after we shrink it.";
    }
  }

  function resetModal() {
    state.photoDataUrl = null;
    state.generatedDataUrl = null;
    state.busy = false;
    els.nameInput.value = "";
    els.photoInput.value = "";
    els.photoPreview.hidden = true;
    els.photoPreview.removeAttribute("src");
    els.busy.hidden = true;
    els.result.hidden = true;
    els.resultImg.removeAttribute("src");
    els.retryBtn.hidden = true;
    els.saveBtn.hidden = true;
    els.generateBtn.hidden = false;
    els.generateBtn.disabled = false;
    setModalError("");
    setType("hero");
  }

  function openModal() {
    resetModal();
    els.modal.classList.add("is-open");
    setTimeout(function () {
      els.nameInput.focus();
    }, 50);
  }

  function closeModal() {
    els.modal.classList.remove("is-open");
  }

  function showBusy(on) {
    state.busy = on;
    els.busy.hidden = !on;
    els.generateBtn.disabled = on;
    els.saveBtn.disabled = on;
    els.retryBtn.disabled = on;
    els.cancelBtn.disabled = on;
  }

  function generateCharacter() {
    setModalError("");
    var name = String(els.nameInput.value || "").trim();
    if (!name) {
      setModalError("Please type a name first.");
      els.nameInput.focus();
      return;
    }
    if (state.type === "hero" && !state.photoDataUrl) {
      setModalError("Add a photo of the child first.");
      return;
    }
    var url = functionUrl();
    if (!url) {
      setModalError("Sync isn't configured on this site — ask a grown-up.");
      return;
    }

    showBusy(true);
    els.result.hidden = true;

    var payload = {
      action: "generate_character",
      characterName: name,
      characterType: state.type,
    };
    if (state.photoDataUrl) {
      payload.referencePhoto = state.photoDataUrl;
    }

    fetch(url, {
      method: "POST",
      headers: fnAuthHeaders(),
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.text().then(function (t) {
          var json = null;
          try {
            json = t ? JSON.parse(t) : null;
          } catch (_e) {
            json = null;
          }
          if (!r.ok) {
            var msg = (json && (json.detail || json.error)) || ("HTTP " + r.status);
            throw new Error(msg);
          }
          return json;
        });
      })
      .then(function (json) {
        if (!json || !json.imageData) {
          throw new Error("Empty response from generator.");
        }
        state.generatedDataUrl = json.imageData;
        els.resultImg.src = json.imageData;
        els.result.hidden = false;
        els.generateBtn.hidden = true;
        els.retryBtn.hidden = false;
        els.saveBtn.hidden = false;
        showBusy(false);
      })
      .catch(function (err) {
        showBusy(false);
        setModalError("Could not generate — " + (err.message || err));
      });
  }

  function saveCharacter() {
    if (!state.generatedDataUrl) return;
    var name = String(els.nameInput.value || "").trim();
    if (!name) {
      setModalError("Please type a name first.");
      return;
    }
    var blob = window.CharacterStore.dataUrlToBlob(state.generatedDataUrl);
    if (!blob) {
      setModalError("Generated image looks empty — try regenerating.");
      return;
    }
    var id = window.CharacterStore.newCharacterId();
    var record = {
      id: id,
      name: name.slice(0, 60),
      type: state.type,
      createdAt: new Date().toISOString(),
    };

    showBusy(true);
    window.CharacterStore.uploadCharacterPng(id, blob, function (err) {
      if (err) {
        showBusy(false);
        setModalError("Saving failed — " + (err.message || err));
        return;
      }
      window.CharacterStore.loadCharacters(function (loadErr, list) {
        var arr = !loadErr && Array.isArray(list) ? list.slice() : [];
        arr.unshift(record);
        window.CharacterStore.saveCharactersIndex(arr, function (saveErr) {
          showBusy(false);
          if (saveErr) {
            setModalError("Saving the index failed — " + (saveErr.message || saveErr));
            return;
          }
          closeModal();
          renderGrid(arr);
          setStatus("Saved " + record.name + " ✨");
        });
      });
    });
  }

  function renderGrid(list) {
    els.grid.innerHTML = "";
    if (!list || list.length === 0) {
      var empty = document.createElement("div");
      empty.className = "ch-empty";
      empty.innerHTML =
        '<div class="ch-empty__emoji">🎨</div>' +
        '<p>No characters yet — tap <strong>+ Add a character</strong> to make your first.</p>';
      els.grid.appendChild(empty);
      return;
    }
    list.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "ch-card";
      card.dataset.id = c.id;

      var imgWrap = document.createElement("div");
      imgWrap.className = "ch-card__img-wrap";
      var placeholder = document.createElement("span");
      placeholder.className = "ch-card__placeholder";
      placeholder.textContent = "Loading…";
      imgWrap.appendChild(placeholder);
      card.appendChild(imgWrap);

      var body = document.createElement("div");
      body.className = "ch-card__body";
      var nm = document.createElement("span");
      nm.className = "ch-card__name";
      nm.textContent = c.name || "Untitled";
      var tp = document.createElement("span");
      tp.className = "ch-card__type" + (c.type === "buddy" ? " ch-card__type--buddy" : "");
      tp.textContent = c.type === "buddy" ? "Buddy" : "Hero";
      body.appendChild(nm);
      body.appendChild(tp);
      card.appendChild(body);

      var del = document.createElement("button");
      del.className = "ch-card__del";
      del.type = "button";
      del.setAttribute("aria-label", "Delete " + (c.name || "character"));
      del.textContent = "✕";
      del.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        confirmAndDelete(c);
      });
      card.appendChild(del);

      els.grid.appendChild(card);

      window.CharacterStore.getCharacterSignedUrl(c.id, function (err, url) {
        if (err || !url) {
          placeholder.textContent = "No image";
          return;
        }
        var img = document.createElement("img");
        img.className = "ch-card__img";
        img.alt = c.name || "";
        img.src = url;
        imgWrap.innerHTML = "";
        imgWrap.appendChild(img);
      });
    });
  }

  function confirmAndDelete(record) {
    if (!window.confirm('Delete "' + (record.name || "this character") + '"?')) {
      return;
    }
    setStatus("Deleting…");
    window.CharacterStore.deleteCharacterImage(record.id, function () {
      // Index update is the source of truth even if the PNG delete fails (orphan PNG ok).
      window.CharacterStore.loadCharacters(function (err, list) {
        var arr = !err && Array.isArray(list) ? list : [];
        var next = arr.filter(function (c) {
          return c.id !== record.id;
        });
        window.CharacterStore.saveCharactersIndex(next, function (saveErr) {
          if (saveErr) {
            setStatus("Delete failed — " + (saveErr.message || saveErr), "error");
            return;
          }
          renderGrid(next);
          setStatus("Deleted.");
        });
      });
    });
  }

  function refreshGrid() {
    if (!window.CharacterStore.isConfigured()) {
      els.signedOut.hidden = false;
      els.signedOut.textContent =
        "Cloud sync isn't set up on this site — ask a grown-up to configure it before saving characters.";
      return;
    }
    setStatus("Loading your characters…");
    window.CharacterStore.loadCharacters(function (err, list) {
      if (err) {
        if (err.message === "no_session") {
          els.signedOut.hidden = false;
          setStatus("");
          return;
        }
        setStatus("Could not load — " + (err.message || err), "error");
        return;
      }
      els.signedOut.hidden = true;
      setStatus("");
      renderGrid(list || []);
    });
  }

  // Wire up events
  els.addBtn.addEventListener("click", function () {
    if (!window.CharacterStore.isConfigured()) {
      setStatus("Cloud sync isn't set up — ask a grown-up.", "error");
      return;
    }
    openModal();
  });
  els.modalClose.addEventListener("click", closeModal);
  els.cancelBtn.addEventListener("click", closeModal);
  els.modal.addEventListener("click", function (ev) {
    if (ev.target === els.modal) closeModal();
  });

  Array.prototype.forEach.call(els.typeOpts, function (btn) {
    btn.addEventListener("click", function () {
      setType(btn.dataset.type);
    });
  });

  els.photoPickBtn.addEventListener("click", function () {
    els.photoInput.click();
  });
  els.photoInput.addEventListener("change", function () {
    var f = els.photoInput.files && els.photoInput.files[0];
    if (!f) return;
    setModalError("");
    compressImageFile(f, function (err, dataUrl) {
      if (err) {
        setModalError(err.message || "Could not read this photo.");
        return;
      }
      state.photoDataUrl = dataUrl;
      els.photoPreview.src = dataUrl;
      els.photoPreview.hidden = false;
    });
  });

  els.generateBtn.addEventListener("click", generateCharacter);
  els.retryBtn.addEventListener("click", function () {
    state.generatedDataUrl = null;
    els.result.hidden = true;
    els.resultImg.removeAttribute("src");
    els.saveBtn.hidden = true;
    els.retryBtn.hidden = true;
    els.generateBtn.hidden = false;
    generateCharacter();
  });
  els.saveBtn.addEventListener("click", saveCharacter);

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && els.modal.classList.contains("is-open") && !state.busy) {
      closeModal();
    }
  });

  // First load: wait briefly for supabase auth to restore from localStorage
  setTimeout(refreshGrid, 250);
})();
