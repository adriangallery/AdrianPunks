/* TigerPunks trait rules — single source of truth for the builder + curator.
   Labels match tigerpunks/manifest.json exactly. gen_data.py ports these for the
   on-chain bake. All checks are by human-readable label / punk id. */
(function (g) {
  // ---- Hair x Hat compatibility (only applies when BOTH present) ----
  // For a hair in ONLY_WITH: that hair may co-occur ONLY with the listed hats.
  const ONLY_WITH = {
    "Bob": ["Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Crown","Fedora","G.I","Head Band","Police Cap","Tiara"],
    "Crazy Hair": ["Crown","Head Band","Tiara"],
    "Wild":       ["Crown","Head Band","Tiara"],
    "Flat Top":   ["Crown","Head Band","Tiara"],
    // tiger-only colourways inherit their base style's hat rule
    "Crazy Blond": ["Crown","Head Band","Tiara"],
    "Crazy Brown": ["Crown","Head Band","Tiara"],
    "Crazy Green": ["Crown","Head Band","Tiara"],
    "Wild Blond":  ["Crown","Head Band","Tiara"],
    "Wild Brown":  ["Crown","Head Band","Tiara"],
  };
  // For a hair in NOT_WITH: that hair may co-occur with any hat EXCEPT the listed ones.
  const NOT_WITH = {
    "Long Hair":        ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Longer Hair Dark": ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Longer Hair":      ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Mohawk":           ["Bandana","Bunny","Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Do rag","Pilot Helmet","Tassle Hat","Propeller Hat"],
    "Normal Popper":    ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Popper":           ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    // tiger-only colourways inherit their base style's hat rule
    "Long Brown":       ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Longer Blond":     ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Longer Brown":     ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Mohawk Green":     ["Bandana","Bunny","Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Do rag","Pilot Helmet","Tassle Hat","Propeller Hat"],
    "Mohawk Red":       ["Bandana","Bunny","Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Do rag","Pilot Helmet","Tassle Hat","Propeller Hat"],
    "Popper Blond":     ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
    "Popper Brown":     ["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
  };

  // Punk-specific option exclusions (by punk id -> {catId: [forbidden labels]})
  const PUNK_EXCLUDE = {
    "ape":         { "Hair": ["Long Hair","Longer Hair Dark","Longer Hair"] },
    "tiger":       { "Hat":  ["Tassle Hat"] },
    "white-tiger": { "Hat":  ["Tassle Hat"] },
    "lama":        { "Hat":  ["Tassle Hat"] },   // Lama uses Tiger's logic (tiger-variant art + same exclusions)
    "npc":         { "Mouth":["Smirk"] },   // "Smile" referenced in spec has no matching mouth (pending)
  };

  const TP = {
    // hair+hat may co-occur?
    hairHatOK(hair, hat) {
      if (!hair || !hat) return true;
      if (ONLY_WITH[hair]) return ONLY_WITH[hair].includes(hat);
      if (NOT_WITH[hair])  return !NOT_WITH[hair].includes(hat);
      return true;
    },
    // Hoodie hat covers the body -> no Top
    topSuppressed(hat) { return hat === "Hoodie"; },
    // Hoodie & Bunny -> no Misc
    miscSuppressed(hat) { return hat === "Hoodie" || hat === "Bunny"; },
    // any hat present -> Jason Mask not allowed
    miscOptionAllowed(miscLabel, hat) { return !(hat && miscLabel === "Jason Mask"); },
    // punk-based exclusion for a single option
    punkOptionAllowed(punkId, catId, optLabel) {
      const ex = PUNK_EXCLUDE[punkId];
      return !(ex && ex[catId] && ex[catId].includes(optLabel));
    },
    // convenience: full validity of a resolved state (labels). Returns true if OK.
    // st = { punkId, Hair, Hat, Mouth, Misc:[...] } using labels.
    stateValid(st) {
      if (!this.hairHatOK(st.Hair, st.Hat)) return false;
      if (st.Top && this.topSuppressed(st.Hat)) return false;
      if ((st.Misc||[]).length && this.miscSuppressed(st.Hat)) return false;
      for (const m of (st.Misc||[])) if (!this.miscOptionAllowed(m, st.Hat)) return false;
      for (const [cat, val] of Object.entries(st)) {
        if (cat === "punkId" || cat === "Misc") continue;
        if (val && !this.punkOptionAllowed(st.punkId, cat, val)) return false;
      }
      for (const m of (st.Misc||[])) if (!this.punkOptionAllowed(st.punkId, "Misc", m)) return false;
      return true;
    },
    ONLY_WITH, NOT_WITH, PUNK_EXCLUDE,
  };

  g.TPRULES = TP;
  if (typeof module !== "undefined" && module.exports) module.exports = TP;   // node tests
})(typeof window !== "undefined" ? window : globalThis);
