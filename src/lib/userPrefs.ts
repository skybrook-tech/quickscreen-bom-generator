const PREFS_KEY = "qsg-user-prefs";

export type PreferredGroutSku =
  | "GROUT-RSC"
  | "GROUT-CONCRETE"
  | "GROUT-POL-10KG"
  | "GROUT-BOS"
  | "GROUT-SIKA";

type UserPrefs = {
  preferredGroutSku?: PreferredGroutSku;
};

function readPrefs(): UserPrefs {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrefs(next: UserPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
}

export function getPreferredGroutSku(): PreferredGroutSku {
  return readPrefs().preferredGroutSku ?? "GROUT-RSC";
}

export function setPreferredGroutSku(sku: PreferredGroutSku) {
  writePrefs({ ...readPrefs(), preferredGroutSku: sku });
}
