/**
 * Portraits used across Snakes & Ladders, Noughts & Crosses, Snap, Memory, etc.
 * Storybook (and other features) can read this for consistent names.
 */
(function (w) {
  /** @type {{ id: string, label: string, portrait: string }[]} */
  w.KidsGameCharacters = [
    { id: "babyca", label: "Baby", portrait: "games/images/character-babyca.png" },
    { id: "tilly", label: "Tilly", portrait: "games/images/tilly-mascot.png" },
    { id: "isaac", label: "Isaac", portrait: "games/images/character-baby-coolegg.png" },
    { id: "sofia", label: "Sofia", portrait: "games/images/character-girl-blonde.png" },
    { id: "kelly", label: "Kelly", portrait: "games/images/character-kelly.png" },
    { id: "freya", label: "Freya", portrait: "games/images/character-freya.png" },
  ];
})(typeof window !== "undefined" ? window : this);
