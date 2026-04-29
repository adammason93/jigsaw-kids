/**
 * Portraits used across Snakes & Ladders, Noughts & Crosses, Snap, Memory, etc.
 * Storybook (and other features) can read this for consistent names.
 */
(function (w) {
  /** @type {{ id: string, label: string }[]} */
  w.KidsGameCharacters = [
    { id: "babyca", label: "Baby" },
    { id: "tilly", label: "Tilly" },
    { id: "isaac", label: "Isaac" },
    { id: "sofia", label: "Sofia" },
    { id: "kelly", label: "Kelly" },
    { id: "freya", label: "Freya" },
  ];
})(typeof window !== "undefined" ? window : this);
