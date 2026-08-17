import filter from "profanity-filter";

// Seed the package with an expanded word list (object form avoids the dynamic
// require of its bundled seed file, keeping this Workers-compatible).
// Replacement values are ignored because we use the "stars" method.
const PROFANITY_WORDS: Record<string, string> = {
  shit: "poop",
  damn: "darn",
  fuck: "fudge",
  fucking: "fudging",
  fucked: "fudged",
  motherfucker: "motherlover",
  bitch: "witch",
  bastard: "rascal",
  ass: "butt",
  asshole: "butthead",
  crap: "junk",
  dick: "nick",
  piss: "miss",
  slut: "snut",
  whore: "bore",
  cunt: "cunt",
  cock: "clock",
  pussy: "bossy",
  penis: "penis",
  vagina: "vagina",
  retard: "person",
  retarded: "person",
  nigger: "person",
  fag: "bag",
  faggot: "baggot",
  dyke: "bike",
  wank: "bank",
  wanker: "banker",
  twat: "twit",
  prick: "stick",
  jerk: "clerk",
  jerkoff: "clerkoff",
  moron: "person",
  idiot: "person",
  dumbass: "dumbbutt",
  bullshit: "bulljunk",
  horseshit: "horsejunk",
  pissed: "missed",
  screwed: "bummed",
  hell: "heck",
  goddamn: "goshdarn",
  jackass: "jackbutt",
  douche: "douse",
  douchebag: "dousebag",
  skank: "snank",
  tramp: "stamp",
};

filter.seed(PROFANITY_WORDS);
filter.setReplacementMethod("stars");

// Mask longest words first so substrings ("ass" inside "asshole") don't leak.
const WORDS = Object.keys(filter.debug().dictionary).sort(
  (a, b) => b.length - a.length
);

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskText(text: string): string {
  let out = text;
  for (const word of WORDS) {
    if (!word) continue;
    out = out.replace(new RegExp(escapeRegExp(word), "gi"), (match) =>
      "*".repeat(match.length)
    );
  }
  return out;
}

/**
 * Recursively masks profane strings within any value (used to sanitize
 * guestbook entries before they are returned on the public read endpoint).
 */
export function filterProfanity(value: unknown): unknown {
  if (typeof value === "string") return maskText(value);
  if (Array.isArray(value)) return value.map(filterProfanity);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        filterProfanity(v),
      ])
    );
  }
  return value;
}
