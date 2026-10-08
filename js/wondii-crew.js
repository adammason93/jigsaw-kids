/* Built-in Wondii Crew. System characters, not owned by a family or a school.
   Idle and hover files are the asset contract. They are not generated here.
   A book references the stable id. It does not copy the character. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiCrew = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var POSES = ["idle", "hover", "happy", "thinking", "surprised", "pointing", "talking"];

  function character(row) {
    var assets = { idle: row.idle, hover: row.hover };
    POSES.forEach(function (pose) {
      if (!assets[pose]) assets[pose] = pose === "idle" || pose === "hover" ? row[pose] : "";
    });
    return {
      id: row.id,
      type: "system",
      name: row.name,
      trait: row.trait,
      description: row.description,
      personality: row.personality.slice(),
      gesture: row.gesture,
      bibleId: row.bibleId || "",
      placeholder: row.placeholder,
      assets: assets,
      manageable: false
    };
  }

  var CREW = [
    character({
      id: "wondii-maya", name: "Maya", trait: "Curious", description: "Loves asking 'why?'",
      personality: ["observant", "inquisitive", "enthusiastic about discovering things"],
      gesture: "wave", bibleId: "maya",
      idle: "assets/characters/wondii/maya-idle.webp", hover: "assets/characters/wondii/maya-wave.webp",
      placeholder: { skin: "#c68642", hair: "#3b2414", hairStyle: "curls", top: "#f6c445", bottom: "#3d5a80" }
    }),
    character({
      id: "wondii-leo", name: "Leo", trait: "Brave", description: "Ready to try something new.",
      personality: ["courageous", "positive", "willing to take the first step"],
      gesture: "pump",
      idle: "assets/characters/wondii/leo-idle.webp", hover: "assets/characters/wondii/leo-pump.webp",
      placeholder: { skin: "#f1c27d", hair: "#d4a574", hairStyle: "short", top: "#3f9d62", bottom: "#2c3338" }
    }),
    character({
      id: "wondii-amara", name: "Amara", trait: "Kind", description: "Always looking out for others.",
      personality: ["warm", "friendly", "thoughtful"],
      gesture: "wave-both",
      idle: "assets/characters/wondii/amara-idle.webp", hover: "assets/characters/wondii/amara-wave.webp",
      placeholder: { skin: "#8d5524", hair: "#1c1c1c", hairStyle: "long", top: "#e07a5f", bottom: "#6d4c41" }
    }),
    character({
      id: "wondii-finn", name: "Finn", trait: "Excited", description: "Brings energy to every adventure.",
      personality: ["energetic", "enthusiastic", "expressive"],
      gesture: "bounce",
      idle: "assets/characters/wondii/finn-idle.webp", hover: "assets/characters/wondii/finn-bounce.webp",
      placeholder: { skin: "#f1c27d", hair: "#a3542b", hairStyle: "curls", top: "#4c78c8", bottom: "#1d3557" }
    }),
    character({
      id: "wondii-zara", name: "Zara", trait: "Creative", description: "Full of colourful ideas.",
      personality: ["imaginative", "inventive", "playful"],
      gesture: "idea",
      idle: "assets/characters/wondii/zara-idle.webp", hover: "assets/characters/wondii/zara-idea.webp",
      placeholder: { skin: "#a56b3c", hair: "#2b2118", hairStyle: "braids", top: "#7d5caf", bottom: "#f4a261" }
    }),
    character({
      id: "wondii-theo", name: "Theo", trait: "Determined", description: "Keeps going when things get tricky.",
      personality: ["persistent", "focused", "encouraging"],
      gesture: "thumb",
      idle: "assets/characters/wondii/theo-idle.webp", hover: "assets/characters/wondii/theo-thumb.webp",
      placeholder: { skin: "#e0ac69", hair: "#1a1a1a", hairStyle: "short", top: "#141b4d", bottom: "#5c6b73" }
    }),
    character({
      id: "wondii-nia", name: "Nia", trait: "Calm", description: "Takes a moment and thinks things through.",
      personality: ["thoughtful", "patient", "reassuring"],
      gesture: "wave-soft",
      idle: "assets/characters/wondii/nia-idle.webp", hover: "assets/characters/wondii/nia-wave.webp",
      placeholder: { skin: "#f3d5b5", hair: "#2c2416", hairStyle: "straight", top: "#7d9a78", bottom: "#f6f1ea" }
    }),
    character({
      id: "wondii-arlo", name: "Arlo", trait: "Adventurous", description: "Always ready to explore.",
      personality: ["curious", "outdoorsy", "bold"],
      gesture: "scout",
      idle: "assets/characters/wondii/arlo-idle.webp", hover: "assets/characters/wondii/arlo-scout.webp",
      placeholder: { skin: "#c68642", hair: "#4a3728", hairStyle: "short", top: "#6b8f71", bottom: "#3d405b" }
    }),
    character({
      id: "wondii-sofia", name: "Sofia", trait: "Happy", description: "Brings a smile wherever she goes.",
      personality: ["cheerful", "positive", "friendly"],
      gesture: "bounce",
      idle: "assets/characters/wondii/sofia-idle.webp", hover: "assets/characters/wondii/sofia-bounce.webp",
      placeholder: { skin: "#f1c27d", hair: "#f6e7a8", hairStyle: "long", top: "#f4a6c1", bottom: "#ffffff" }
    }),
    character({
      id: "wondii-ravi", name: "Ravi", trait: "Confident", description: "Believes he can give it a go.",
      personality: ["self-assured", "encouraging", "positive"],
      gesture: "thumb",
      idle: "assets/characters/wondii/ravi-idle.webp", hover: "assets/characters/wondii/ravi-thumb.webp",
      placeholder: { skin: "#8d5524", hair: "#1c1c1c", hairStyle: "short", top: "#ef8b3a", bottom: "#4a4e69" }
    }),
    character({
      id: "wondii-elsie", name: "Elsie", trait: "Caring", description: "Notices how other people feel.",
      personality: ["empathetic", "gentle", "supportive"],
      gesture: "heart",
      idle: "assets/characters/wondii/elsie-idle.webp", hover: "assets/characters/wondii/elsie-heart.webp",
      placeholder: { skin: "#e0ac69", hair: "#6b3f2a", hairStyle: "bob", top: "#7eb8c9", bottom: "#f6f1ea" }
    }),
    character({
      id: "wondii-jasper", name: "Jasper", trait: "Funny", description: "Finds fun wherever he goes.",
      personality: ["playful", "cheeky", "good-natured"],
      gesture: "wave",
      idle: "assets/characters/wondii/jasper-idle.webp", hover: "assets/characters/wondii/jasper-wave.webp",
      placeholder: { skin: "#f3d5b5", hair: "#8d5a32", hairStyle: "messy", top: "#d4534b", bottom: "#2c3338" }
    })
  ];

  var BY_ID = {};
  CREW.forEach(function (row) { BY_ID[row.id] = row; });

  function list() {
    return CREW.map(function (row) { return row; });
  }

  function get(id) {
    return BY_ID[String(id || "")] || null;
  }

  /* Hover, keyboard focus, or a touch selection shows the hover pose.
     Reduced motion keeps the pose change and drops the lift. */
  function poseState(input) {
    var source = input || {};
    var active = !!(source.hover || source.focus || source.selected);
    return {
      pose: active ? "hover" : "idle",
      animate: !source.reducedMotion,
      crossfade: true
    };
  }

  /* A story stores the system id. It does not create a workspace copy. */
  function bookCast(character) {
    var row = typeof character === "string" ? get(character) : character;
    if (!row || row.type !== "system") return null;
    return {
      characterType: "system",
      characterId: row.id,
      bibleId: row.bibleId || "",
      reference: row.assets.idle,
      origin: "system"
    };
  }

  function workspaceCast(record) {
    if (!record || !record.id) return null;
    return {
      characterType: "workspace",
      characterId: String(record.id),
      ownerType: record.ownerType || "",
      ownerId: record.ownerId || "",
      reference: record.reference || ("characters/" + record.id + ".png"),
      origin: "saved"
    };
  }

  function manifest() {
    return list().map(function (row) {
      return {
        id: row.id,
        name: row.name,
        idle: row.assets.idle,
        hover: row.assets.hover,
        width: 960,
        height: 1400,
        aspectRatio: "24 / 35",
        background: "transparent"
      };
    });
  }

  function canManage(row) {
    return !!(row && row.type !== "system" && row.id && row.manageable !== false);
  }

  return {
    POSES: POSES,
    list: list,
    get: get,
    poseState: poseState,
    bookCast: bookCast,
    workspaceCast: workspaceCast,
    canManage: canManage,
    manifest: manifest
  };
});
