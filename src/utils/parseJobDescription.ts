import type { FenceConfig } from '../schemas/fence.schema';

export interface ParseResult {
  config: Partial<FenceConfig>;
  detected: string[];
}

// Maps the HTML app's internal colour codes to React slug values
const COLOUR_PATTERNS: [string | RegExp, FenceConfig['colour']][] = [
  ['surfmist',          'surfmist-matt'],
  ['monument',          'monument-matt'],
  ['woodland grey',     'woodland-grey-matt'],
  ['woodland gray',     'woodland-grey-matt'],
  ['pearl white',       'pearl-white-gloss'],
  ['basalt',            'basalt-satin'],
  ['dune',              'dune-satin'],
  ['palladium silver',  'palladium-silver-pearl'],
  ['paperbark',         'paperbark'],
  ['primrose',          'primrose'],
  [/\bmill\b/,          'mill'],
  ['black satin',       'black-satin'],
  [/\bblack\b/,         'black-satin'],
  [/\bwhite\b/,         'pearl-white-gloss'],
];

export function parseJobDescription(text: string): ParseResult {
  const t = text.toLowerCase();
  const config: Partial<FenceConfig> = {};
  const detected: string[] = [];

  // ── Run length ──────────────────────────────────────────────────────────────
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:metres?|meters?)\b/);
  if (!m) m = t.match(/(\d+(?:\.\d+)?)\s*m\b(?!\s*m)/); // bare 'm' but not 'mm'
  if (m) {
    config.totalRunLength = parseFloat(m[1]);
    detected.push('run length');
  } else {
    const mmMatch = t.match(/(\d{3,6})\s*mm\s*(?:long|run|length|fence|screen)/);
    if (mmMatch) {
      config.totalRunLength = parseInt(mmMatch[1]) / 1000;
      detected.push('run length');
    }
  }

  // ── Target height ───────────────────────────────────────────────────────────
  const heightMm = t.match(/(\d{3,4})\s*mm\s*(?:high|tall|height)/);
  if (heightMm) {
    config.targetHeight = parseInt(heightMm[1]);
    detected.push('height');
  } else {
    const heightM = t.match(/(\d(?:\.\d+)?)\s*m\s*(?:high|tall|height)/);
    if (heightM) {
      config.targetHeight = Math.round(parseFloat(heightM[1]) * 1000);
      detected.push('height');
    }
  }

  // ── Slat size ───────────────────────────────────────────────────────────────
  if (/\b65\s*mm\s*slat|slat.*\b65\b|\b65\s*mm\b/.test(t)) {
    config.slatSize = '65';
    detected.push('slat size');
  } else if (/\b90\s*mm\s*slat|slat.*\b90\b|\b90\s*mm\b/.test(t)) {
    config.slatSize = '90';
    detected.push('slat size');
  }

  // ── Slat gap ────────────────────────────────────────────────────────────────
  const gapMatch = t.match(/(\d+)\s*mm\s*gap|gap\s*(?:of\s*)?(\d+)\s*mm|(\d+)\s*mm\s*spac/);
  if (gapMatch) {
    const gap = parseInt(gapMatch[1] ?? gapMatch[2] ?? gapMatch[3]);
    if (([5, 9, 20] as number[]).includes(gap)) {
      config.slatGap = String(gap) as FenceConfig['slatGap'];
      detected.push('slat gap');
    }
  }

  // ── Colour ──────────────────────────────────────────────────────────────────
  for (const [pattern, slug] of COLOUR_PATTERNS) {
    const hit = typeof pattern === 'string' ? t.includes(pattern) : pattern.test(t);
    if (hit) {
      config.colour = slug;
      detected.push('colour');
      break;
    }
  }

  // ── Post mounting ───────────────────────────────────────────────────────────
  if (/concret|in[- ]ground/.test(t)) {
    config.postMounting = 'concreted-in-ground';
    detected.push('post mounting');
  } else if (/base[- ]?plat|bolted|slab/.test(t)) {
    config.postMounting = 'base-plated-to-slab';
    detected.push('post mounting');
  } else if (/core[- ]?drill/.test(t)) {
    config.postMounting = 'core-drilled-into-concrete';
    detected.push('post mounting');
  }

  // ── Termination ─────────────────────────────────────────────────────────────
  if (/wall[- ]to[- ]wall/.test(t)) {
    config.leftTermination  = 'wall';
    config.rightTermination = 'wall';
    detected.push('termination');
  } else if (/post[- ]to[- ]wall|wall[- ]to[- ]post/.test(t)) {
    config.leftTermination  = 'post';
    config.rightTermination = 'wall';
    detected.push('termination');
  } else if (/post[- ]to[- ]post|freestand|both.*post|post.*both/.test(t)) {
    config.leftTermination  = 'post';
    config.rightTermination = 'post';
    detected.push('termination');
  }

  // ── Max panel width (wind / exposed) ────────────────────────────────────────
  if (/wind|exposed|coastal/.test(t)) {
    config.maxPanelWidth = '2000';
    detected.push('panel width (2000mm)');
  }

  // ── System type ─────────────────────────────────────────────────────────────
  if (/\bvertical\b/.test(t)) {
    config.systemType = 'VS';
    detected.push('system type');
  } else if (/xpress[- ]plus|xpl\b|insert[- ]system|\bpremium\b/.test(t)) {
    config.systemType = 'XPL';
    detected.push('system type');
  } else if (/buy[- ]as[- ]you[- ]go|bayg\b/.test(t)) {
    config.systemType = 'BAYG';
    detected.push('system type');
  } else if (/\bhorizontal\b/.test(t)) {
    config.systemType = 'QSHS';
    detected.push('system type');
  }

  // ── Corners ─────────────────────────────────────────────────────────────────
  const cornerMatch = t.match(/(\d)\s*(?:90[- ]degree|90°|corner|turn|bend)/);
  if (cornerMatch) {
    config.corners = parseInt(cornerMatch[1]);
    detected.push('corners');
  }

  return { config, detected };
}
