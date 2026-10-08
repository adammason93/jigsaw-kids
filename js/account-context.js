/* Which workspace owns the signed-in session.
   A school membership never falls through to a family library. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiAccount = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function workspaceFrom(input) {
    var source = input || {};
    var userId = String(source.userId || (source.session && source.session.user && source.session.user.id) || "");
    var org = source.organisation || null;
    var orgId = String((org && org.id) || source.organisationId || "");
    if (!userId) {
      return { kind: "signed-out", ownerType: "", ownerId: "", userId: "", role: "", label: "" };
    }
    if (orgId) {
      return {
        kind: "school",
        ownerType: "school",
        ownerId: orgId,
        userId: userId,
        role: String(source.role || ""),
        label: String((org && org.name) || source.organisationName || "")
      };
    }
    return {
      kind: "family",
      ownerType: "family",
      ownerId: userId,
      userId: userId,
      role: "owner",
      label: "Family"
    };
  }

  /* Family records stay in the original {user id}/characters folder.
     School records live under school/{organisation id}/characters. */
  function storagePrefix(workspace) {
    if (!workspace || !workspace.ownerId) return "";
    if (workspace.ownerType === "school") return "school/" + workspace.ownerId;
    if (workspace.ownerType === "family") return workspace.ownerId;
    return "";
  }

  function sameWorkspace(left, right) {
    return !!(left && right && left.ownerType && left.ownerType === right.ownerType && left.ownerId === right.ownerId);
  }

  function stampRecord(record, workspace) {
    var source = record || {};
    var id = String(source.id || "");
    return {
      id: id,
      name: String(source.name || "").slice(0, 60),
      type: source.type === "buddy" ? "buddy" : "hero",
      createdAt: source.createdAt || "",
      updatedAt: source.updatedAt || source.createdAt || "",
      ownerType: workspace.ownerType,
      ownerId: workspace.ownerId,
      createdBy: String(source.createdBy || workspace.userId || ""),
      reference: String(source.reference || (id ? "characters/" + id + ".png" : ""))
    };
  }

  function normalizeRecord(record, workspace) {
    if (!record || !workspace || !workspace.ownerId) return null;
    var ownedType = record.ownerType === "school" || record.ownerType === "family" ? record.ownerType : "";
    var ownedId = record.ownerId ? String(record.ownerId) : "";
    if (!ownedType && !ownedId && workspace.ownerType === "family") {
      ownedType = "family";
      ownedId = workspace.ownerId;
    }
    if (ownedType !== workspace.ownerType || ownedId !== workspace.ownerId) return null;
    return stampRecord(Object.assign({}, record, { ownerType: ownedType, ownerId: ownedId }), workspace);
  }

  function visibleRecords(index, workspace) {
    var rows = [];
    (index || []).forEach(function (record) {
      var row = normalizeRecord(record, workspace);
      if (row) rows.push(row);
    });
    return rows;
  }

  function applySave(index, record, workspace) {
    if (!workspace || !workspace.ownerId) return { ok: false, code: "no_workspace", index: index || [] };
    if (!record || !String(record.id || "") || !String(record.name || "").trim()) {
      return { ok: false, code: "invalid", index: index || [] };
    }
    var stamped = stampRecord(record, workspace);
    stamped.name = String(record.name).trim().slice(0, 60);
    stamped.updatedAt = record.updatedAt || new Date().toISOString();
    if (!stamped.createdAt) stamped.createdAt = stamped.updatedAt;
    var next = [];
    (index || []).forEach(function (row) {
      if (row && row.id !== stamped.id) next.push(row);
    });
    next.unshift(stamped);
    return { ok: true, code: "", record: stamped, index: visibleRecords(next, workspace) };
  }

  function authNotice(workspace) {
    if (workspace && workspace.kind === "school") {
      return {
        code: "school-signed-out",
        text: "Your school session has ended. Log in again to open this school's characters."
      };
    }
    return {
      code: "signed-out",
      text: "Log in to Wondii to see this account's characters."
    };
  }

  function legacyRoute(input) {
    var workspace = workspaceFrom(input);
    if (workspace.kind === "signed-out") return { action: "redirect", href: "portal.html", workspace: workspace };
    return { action: "redirect", href: "portal.html#characters", workspace: workspace };
  }

  /* What this workspace may do. A school login does not remove the shared Wondii home. */
  function capabilities(input) {
    var source = input || {};
    var workspace = source.kind ? source : workspaceFrom(source);
    var role = String(source.role || workspace.role || "");
    var teach = workspace.kind === "school";
    return {
      workspaceKind: workspace.kind || "signed-out",
      role: role,
      canCreateStory: true,
      canCreateGame: true,
      canCreatePuzzle: true,
      canCreateLearningAdventure: teach,
      canManageClasses: teach,
      canViewResults: teach,
      canViewAdventures: teach
    };
  }

  return {
    workspaceFrom: workspaceFrom,
    storagePrefix: storagePrefix,
    sameWorkspace: sameWorkspace,
    stampRecord: stampRecord,
    normalizeRecord: normalizeRecord,
    visibleRecords: visibleRecords,
    applySave: applySave,
    authNotice: authNotice,
    legacyRoute: legacyRoute,
    capabilities: capabilities
  };
});
