export type MeasurementCandidate = {
  raw: string;
  metres: number;
  mm: number;
  index: number;
};

const FILLER_RE = /\b(?:about|roughly|around|approximately|approx|like)\b/gi;

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const WORD_PATTERN = Object.keys(NUMBER_WORDS).join("|");
const VALUE_PATTERN = `(?:\\d+(?:\\.\\d+)?|${WORD_PATTERN})`;
const UNIT_PATTERN = `(?:m|metres?|meters?)`;

function clean(input: string) {
  return input
    .toLowerCase()
    .replace(/[,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripFillers(input: string) {
  return clean(input.replace(FILLER_RE, " "));
}

function tokenNumber(token: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

function mmFromMetres(metres: number) {
  return Math.round(metres * 1000);
}

function candidate(raw: string, metres: number, index: number): MeasurementCandidate | null {
  if (!Number.isFinite(metres) || metres <= 0) return null;
  return {
    raw: raw.trim(),
    metres,
    mm: mmFromMetres(metres),
    index,
  };
}

function addUnique(target: MeasurementCandidate[], item: MeasurementCandidate | null) {
  if (!item) return;
  const key = `${item.index}|${item.raw.toLowerCase()}|${item.mm}`;
  if (target.some((existing) => `${existing.index}|${existing.raw.toLowerCase()}|${existing.mm}` === key)) return;
  target.push(item);
}

export function parseMeasurementToMetres(input: string): number | null {
  const phrase = stripFillers(input);
  if (!phrase) return null;

  const metrePlusCentimetres = phrase.match(
    new RegExp(`^(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})\\s+(\\d{1,2})(?!\\.)\\s*(?:cm|centimetres?|centimeters?)?$`, "i"),
  );
  if (metrePlusCentimetres) {
    const metres = tokenNumber(metrePlusCentimetres[1]);
    const centimetres = Number(metrePlusCentimetres[2]);
    if (metres != null && centimetres >= 0 && centimetres < 100) return metres + centimetres / 100;
  }

  const half = phrase.match(new RegExp(`^(${VALUE_PATTERN})\\s+and\\s+(?:a\\s+)?half\\s*(?:${UNIT_PATTERN})?$`, "i"));
  if (half) {
    const metres = tokenNumber(half[1]);
    if (metres != null) return metres + 0.5;
  }

  const point = phrase.match(new RegExp(`^(${VALUE_PATTERN})\\s+point\\s+(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})?$`, "i"));
  if (point) {
    const whole = tokenNumber(point[1]);
    const decimal = tokenNumber(point[2]);
    if (whole != null && decimal != null && decimal >= 0 && decimal < 10) return Number(`${whole}.${decimal}`);
  }

  const spokenCentimetres = phrase.match(new RegExp(`^(${VALUE_PATTERN})\\s+(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})?$`, "i"));
  if (spokenCentimetres) {
    const metres = tokenNumber(spokenCentimetres[1]);
    const centimetres = tokenNumber(spokenCentimetres[2]);
    if (metres != null && centimetres != null && centimetres > 0 && centimetres < 100) return metres + centimetres / 100;
  }

  const simple = phrase.match(new RegExp(`^(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})?$`, "i"));
  if (simple) {
    return tokenNumber(simple[1]);
  }

  return null;
}

export function extractMeasurementCandidates(input: string): MeasurementCandidate[] {
  const text = clean(input);
  const candidates: MeasurementCandidate[] = [];
  const patterns = [
    new RegExp(`\\b(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})\\s+(\\d{1,2})(?!\\.)\\s*(?:cm|centimetres?|centimeters?)?\\b`, "gi"),
    new RegExp(`\\b(${VALUE_PATTERN})\\s+and\\s+(?:a\\s+)?half\\s*(?:${UNIT_PATTERN})?\\b`, "gi"),
    new RegExp(`\\b(${VALUE_PATTERN})\\s+point\\s+(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})?\\b`, "gi"),
    new RegExp(`\\b(${VALUE_PATTERN})\\s+fifty\\s*(?:${UNIT_PATTERN})?\\b`, "gi"),
    new RegExp(`\\b(${VALUE_PATTERN})\\s*(?:${UNIT_PATTERN})\\b`, "gi"),
    new RegExp(`\\b(?:about|roughly|around|approximately|approx)\\s+(${VALUE_PATTERN})\\b(?!\\s*(?:mm|mil|mils|cm|ft|feet|'|in|inch|inches|"))`, "gi"),
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[0];
      const metres = parseMeasurementToMetres(raw);
      addUnique(candidates, metres == null ? null : candidate(raw, metres, match.index ?? 0));
    }
  }

  return candidates.sort((a, b) => a.index - b.index);
}

export function parseMeasurementToMm(input: string): number | null {
  const metres = parseMeasurementToMetres(input);
  return metres == null ? null : mmFromMetres(metres);
}
