// config/resolve_test.ts — tests for the declarative options_when_json mechanism,
// normaliseVariables, and resolveUiConfig.
//
// Run with: deno test supabase/functions/bom-calculator-static/config/resolve_test.ts

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import { matchesWhen, resolveConfigRef, resolveOptionsForField } from "./optionsWhen.ts";
import { normaliseVariables } from "./normalise.ts";
import { resolveUiConfig } from "./resolve.ts";
import { BASE_CONFIGS } from "./base.ts";

function loadProductConfig(code: string) {
  const config = BASE_CONFIGS[code];
  if (!config) throw new Error(`Unknown product code: ${code}`);
  return config;
}

// ─── matchesWhen ──────────────────────────────────────────────────────────────

Deno.test("matchesWhen: exact string match", () => {
  assertEquals(matchesWhen({ finish_family: "economy" }, { finish_family: "economy" }), true);
  assertEquals(matchesWhen({ finish_family: "economy" }, { finish_family: "standard" }), false);
});

Deno.test("matchesWhen: string coercion — number value matches string key", () => {
  assertEquals(matchesWhen({ slat_size_mm: 90 }, { slat_size_mm: 90 }), true);
  assertEquals(matchesWhen({ slat_size_mm: 90 }, { slat_size_mm: "90" }), true);
  assertEquals(matchesWhen({ slat_size_mm: "90" }, { slat_size_mm: 90 }), true);
});

Deno.test("matchesWhen: in-array match", () => {
  assertEquals(
    matchesWhen({ gate_movement: ["single_swing", "double_swing"] }, { gate_movement: "single_swing" }),
    true,
  );
  assertEquals(
    matchesWhen({ gate_movement: ["single_swing", "double_swing"] }, { gate_movement: "sliding" }),
    false,
  );
});

Deno.test("matchesWhen: not operator", () => {
  assertEquals(
    matchesWhen({ finish_family: { not: "economy" } }, { finish_family: "standard" }),
    true,
  );
  assertEquals(
    matchesWhen({ finish_family: { not: "economy" } }, { finish_family: "economy" }),
    false,
  );
});

Deno.test("matchesWhen: not_in operator", () => {
  assertEquals(
    matchesWhen({ finish_family: { not_in: ["economy", "alumawood"] } }, { finish_family: "standard" }),
    true,
  );
  assertEquals(
    matchesWhen({ finish_family: { not_in: ["economy", "alumawood"] } }, { finish_family: "economy" }),
    false,
  );
});

Deno.test("matchesWhen: multiple keys are AND-ed", () => {
  assertEquals(
    matchesWhen({ finish_family: "alumawood", slat_size_mm: 90 }, { finish_family: "alumawood", slat_size_mm: 90 }),
    true,
  );
  assertEquals(
    matchesWhen({ finish_family: "alumawood", slat_size_mm: 90 }, { finish_family: "alumawood", slat_size_mm: 65 }),
    false,
  );
});

Deno.test("matchesWhen: empty when {} matches everything", () => {
  assertEquals(matchesWhen({}, { anything: "goes" }), true);
  assertEquals(matchesWhen({}, {}), true);
});

// ─── resolveConfigRef ─────────────────────────────────────────────────────────

Deno.test("resolveConfigRef: allowed paths return arrays", () => {
  const config = loadProductConfig("QSHS");
  const result = resolveConfigRef(config, "colours.standard");
  assertEquals(Array.isArray(result), true);
  assertEquals(result.length > 0, true);
});

Deno.test("resolveConfigRef: disallowed path returns []", () => {
  const config = loadProductConfig("QSHS");
  const result = resolveConfigRef(config, "internalSkus.slat.standard");
  assertEquals(result, []);
});

Deno.test("resolveConfigRef: unknown path returns []", () => {
  const config = loadProductConfig("QSHS");
  const result = resolveConfigRef(config, "nonexistent.path");
  assertEquals(result, []);
});

// ─── QSHS option cascade ──────────────────────────────────────────────────────

Deno.test("QSHS: economy finish restricts slat_size_mm to 65 only", () => {
  const config = loadProductConfig("QSHS");
  const vars = { finish_family: "economy", slat_size_mm: 90 };
  const slatField = config.fields.find((f) => f.field_key === "slat_size_mm")!;
  const { options } = resolveOptionsForField(config, slatField, vars);
  const values = options.map((o: unknown) => {
    if (o && typeof o === "object" && "value" in o) return (o as { value: unknown }).value;
    return o;
  });
  assertEquals(values.includes(65) || values.includes("65"), true);
  assertEquals(values.includes(90) || values.includes("90"), false);
});

Deno.test("QSHS: economy finish restricts colour_code to economy palette", () => {
  const config = loadProductConfig("QSHS");
  const vars = { finish_family: "economy", slat_size_mm: 65, colour_code: "KWI" };
  const colourField = config.fields.find((f) => f.field_key === "colour_code")!;
  const { options } = resolveOptionsForField(config, colourField, vars);
  assertEquals(options.length > 0, true);
  // KWI is alumawood-only — not in economy palette
  assertEquals(options.includes("KWI"), false);
});

Deno.test("QSHS: alumawood+90 restricts colour_code to WRC only", () => {
  const config = loadProductConfig("QSHS");
  const vars = { finish_family: "alumawood", slat_size_mm: 90 };
  const colourField = config.fields.find((f) => f.field_key === "colour_code")!;
  const { options } = resolveOptionsForField(config, colourField, vars);
  assertEquals(options.length, 1);
  assertEquals(options[0], "WRC");
});

Deno.test("QSHS: alumawood+65 gives full alumawood palette", () => {
  const config = loadProductConfig("QSHS");
  const vars = { finish_family: "alumawood", slat_size_mm: 65 };
  const colourField = config.fields.find((f) => f.field_key === "colour_code")!;
  const { options } = resolveOptionsForField(config, colourField, vars);
  assertEquals(options.length > 1, true);
  assertEquals(options.includes("KWI"), true);
  assertEquals(options.includes("WRC"), true);
});

Deno.test("QSHS: standard finish gives standard palette", () => {
  const config = loadProductConfig("QSHS");
  const vars = { finish_family: "standard" };
  const colourField = config.fields.find((f) => f.field_key === "colour_code")!;
  const { options } = resolveOptionsForField(config, colourField, vars);
  assertEquals(options.length > 5, true);
  assertEquals(options.includes("B"), true);
  assertEquals(options.includes("KWI"), false);
});

// ─── QSHS normalise: post_colour follows colour_code ─────────────────────────

Deno.test("QSHS: post_colour_code mirrors colour_code when not diverged", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, {
    finish_family: "standard",
    colour_code: "MN",
  });
  assertEquals(vars.post_colour_code, "MN");
});

Deno.test("QSHS: post_colour_code stays diverged once explicitly set", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, {
    finish_family: "standard",
    colour_code: "MN",
    post_colour_code: "B",
  });
  assertEquals(vars.post_colour_code, "B");
});

// ─── QSHS normalise: alias sync ───────────────────────────────────────────────

Deno.test("QSHS: mounting_method is aliased to mounting_type", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, { mounting_type: "base_plate" });
  assertEquals(vars.mounting_method, "base_plate");
});

// ─── QSHS normalise: custom gap skips snap ────────────────────────────────────

Deno.test("QSHS: slat_gap_mm preserves custom value when slat_gap_mode=custom", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, {
    slat_gap_mm: 17,
    slat_gap_mode: "custom",
  });
  assertEquals(vars.slat_gap_mm, 17);
});

Deno.test("QSHS: slat_gap_mm snaps to valid option when not in custom mode", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, { slat_gap_mm: 17, slat_gap_mode: "spacer" });
  const slatField = config.fields.find((f) => f.field_key === "slat_gap_mm")!;
  const declared = (slatField.options_json ?? []).map((o: unknown) =>
    o && typeof o === "object" && "value" in o ? (o as { value: unknown }).value : o,
  );
  assertEquals(declared.includes(Number(vars.slat_gap_mm)) || declared.includes(String(vars.slat_gap_mm)), true);
});

// ─── QSHS normalise: panel clamp ──────────────────────────────────────────────

Deno.test("QSHS: max_panel_width_mm clamped to panelRules bounds", () => {
  const config = loadProductConfig("QSHS");
  const vars = normaliseVariables(config, { max_panel_width_mm: 99999 });
  assertEquals(Number(vars.max_panel_width_mm) <= config.panelRules.maxPostSpacingMm, true);
});

// ─── QS_GATE field filtering ──────────────────────────────────────────────────

Deno.test("QS_GATE: gate_build filters to sliding options when gate_movement=sliding", () => {
  const config = loadProductConfig("QS_GATE");
  const vars = { gate_movement: "sliding" };
  const buildField = config.fields.find((f) => f.field_key === "gate_build")!;
  const { options } = resolveOptionsForField(config, buildField, vars);
  const values = options.map((o: unknown) => {
    if (o && typeof o === "object" && "value" in o) return (o as { value: unknown }).value;
    return o;
  });
  assertEquals(values.every((v: unknown) => String(v).includes("sliding")), true);
  assertEquals(values.some((v: unknown) => String(v).includes("hinged")), false);
});

Deno.test("QS_GATE: gate_build filters to hinged options when gate_movement=single_swing", () => {
  const config = loadProductConfig("QS_GATE");
  const vars = { gate_movement: "single_swing" };
  const buildField = config.fields.find((f) => f.field_key === "gate_build")!;
  const { options } = resolveOptionsForField(config, buildField, vars);
  const values = options.map((o: unknown) => {
    if (o && typeof o === "object" && "value" in o) return (o as { value: unknown }).value;
    return o;
  });
  assertEquals(values.every((v: unknown) => String(v).includes("hinged")), true);
  assertEquals(values.some((v: unknown) => String(v).includes("sliding")), false);
});

Deno.test("QS_GATE: colour_code sourced from colours.gate", () => {
  const config = loadProductConfig("QS_GATE");
  const vars = { gate_movement: "single_swing" };
  const colourField = config.fields.find((f) => f.field_key === "colour_code")!;
  const { options } = resolveOptionsForField(config, colourField, vars);
  assertEquals(options.length > 0, true);
  assertEquals(options, config.colours.gate);
});

// ─── Payload hygiene: authoring keys stripped ─────────────────────────────────

Deno.test("resolveUiConfig: authoring keys stripped from resolved fields", () => {
  const config = loadProductConfig("QSHS");
  const resolved = resolveUiConfig(config);
  for (const field of resolved.fields) {
    assertEquals("options_when_json" in field, false);
    assertEquals("snap_to_options" in field, false);
    assertEquals("snap_unless_json" in field, false);
    assertEquals("follows_field" in field, false);
    assertEquals("aliases" in field, false);
  }
});

// ─── All products resolve without throwing ────────────────────────────────────

const PRODUCT_CODES = ["QSHS", "VS", "XPL", "BAYG", "QS_GATE"] as const;

for (const code of PRODUCT_CODES) {
  Deno.test(`resolveUiConfig(${code}): resolves without throwing`, () => {
    const config = loadProductConfig(code as string);
    const result = resolveUiConfig(config);
    assertEquals(typeof result.productCode, "string");
    assertEquals(Array.isArray(result.fields), true);
    assertEquals(result.fields.length > 0, true);
  });
}

// ─── slat_size_mm options_json bug regression ─────────────────────────────────
// Old slatOptions() treated {value,label} objects as number[] → options_json = []
// and normalisedVariables.slat_size_mm became an object.

Deno.test("QSHS: slat_size_mm options resolve to primitive values, not objects", () => {
  const config = loadProductConfig("QSHS");
  const resolved = resolveUiConfig(config);
  const slatField = resolved.fields.find((f) => f.field_key === "slat_size_mm")!;
  assertEquals(Array.isArray(slatField.options_json), true);
  assertEquals((slatField.options_json?.length ?? 0) > 0, true);
});

Deno.test("QSHS: normalisedVariables.slat_size_mm is a number, not an object", () => {
  const config = loadProductConfig("QSHS");
  const resolved = resolveUiConfig(config);
  assertEquals(typeof resolved.normalisedVariables.slat_size_mm, "number");
});
