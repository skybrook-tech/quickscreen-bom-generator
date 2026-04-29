import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

type Variables = Record<string, string | number | boolean>;

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const ECONOMY_COLOURS = ["B", "MN", "SM"];

const SYSTEM_MAX_PANEL_WIDTH: Record<string, number> = {
  QSHS: 3000,
  VS: 2600,
  XPL: 3000,
};

export function maxPanelWidthForSystem(productCode: string | null | undefined) {
  return productCode ? (SYSTEM_MAX_PANEL_WIDTH[productCode] ?? 2600) : 2600;
}

function optionField(
  productCode: string,
  name: string,
  label: string,
  options: Array<string | number>,
  defaultValue: string | number,
  sortOrder: number,
): SchemaField {
  return {
    id: `${productCode}-${name}-job-synthetic`,
    field_key: name,
    label,
    control_type: "select",
    data_type: typeof defaultValue === "number" ? "number" : "enum",
    required: true,
    default_value_json: defaultValue,
    options_json: options,
    visible_when_json: {},
    sort_order: sortOrder,
  };
}

function cloneField(field: SchemaField, patch: Partial<SchemaField>): SchemaField {
  return { ...field, ...patch };
}

export function finishOptionsForSystem(productCode: string) {
  if (productCode === "XPL") return ["standard", "alumawood"];
  if (productCode === "QSHS" || productCode === "VS") {
    return ["standard", "economy", "alumawood"];
  }
  return ["standard"];
}

export function slatOptionsForSystem(productCode: string, variables: Variables) {
  const finish = String(variables.finish_family ?? "standard");
  if (productCode === "XPL") return [65];
  if (finish === "economy") return [65];
  return [65, 90];
}

export function gapOptionsForSystem(productCode: string) {
  if (productCode === "XPL") return [5, 9, 20];
  if (productCode === "QSHS") return [5, 9, 12, 15, 20, 30];
  if (productCode === "VS") return [5, 9, 20];
  return [];
}

export function heightOptionsForSystem(productCode: string, variables: Variables) {
  if (productCode === "VS") return [];
  const slatSize = Number(variables.slat_size_mm ?? 65);
  const slatGap = Number(variables.slat_gap_mm ?? 5);
  const slatDesignWidth = slatSize === 90 ? 90.3 : 65.3;
  if (!Number.isFinite(slatGap) || slatGap < 0) return [];
  const heights: number[] = [];
  for (let slats = 1; slats <= 80; slats++) {
    const height = Math.round(slats * (slatDesignWidth + slatGap) - slatGap + 3);
    if (height >= 300 && height <= 2400) heights.push(height);
  }
  return heights;
}

export function colourOptionsForSystem(variables: Variables) {
  const finish = String(variables.finish_family ?? "standard");
  const slatSize = Number(variables.slat_size_mm ?? 65);

  if (finish === "economy") return ECONOMY_COLOURS;
  if (finish === "alumawood") {
    return slatSize === 90 ? ["WRC"] : ALUMAWOOD_COLOURS;
  }
  return STANDARD_COLOURS;
}

export function postColourOptionsForSystem(variables: Variables) {
  const finish = String(variables.finish_family ?? "standard");
  if (finish === "alumawood") return [...ALUMAWOOD_COLOURS, ...STANDARD_COLOURS];
  return STANDARD_COLOURS;
}

export function initialVariablesForSystem(productCode: string): Variables {
  const maxPanelWidth = maxPanelWidthForSystem(productCode);
  return normaliseVariablesForSystem(productCode, {
    finish_family: "standard",
    colour_code: "B",
    post_colour_code: "B",
    slat_size_mm: 65,
    slat_gap_mode: "spacer",
    slat_gap_mm: 5,
    post_size: 50,
    post_system: productCode === "XPL" ? "xpl" : "standard_50",
    mounting_type: "in_ground",
    mounting_method: "in_ground",
    max_panel_width_mm: maxPanelWidth,
  });
}

export function normaliseVariablesForSystem(
  productCode: string,
  variables: Variables,
): Variables {
  const finishOptions = finishOptionsForSystem(productCode);
  const finish = finishOptions.includes(String(variables.finish_family))
    ? String(variables.finish_family)
    : finishOptions[0];

  let next: Variables = {
    ...variables,
    finish_family: finish,
  };

  const postSystem = String(
    next.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  const validPostSystem = ["xpl", "standard_50", "standard_65"].includes(postSystem)
    ? postSystem
    : productCode === "XPL"
      ? "xpl"
      : "standard_50";
  next = {
    ...next,
    post_system: validPostSystem,
    post_size: validPostSystem === "standard_65" ? 65 : Number(next.post_size ?? 50),
  };
  if (validPostSystem === "standard_50" || productCode !== "XPL") {
    next = { ...next, post_size: Number(next.post_size) === 65 ? 65 : 50 };
  }

  const mounting = String(
    next.mounting_method ?? next.mounting_type ?? "in_ground",
  );
  const validMounting = ["in_ground", "base_plate", "core_drill"].includes(mounting)
    ? mounting
    : "in_ground";
  next = {
    ...next,
    mounting_type: validMounting,
    mounting_method: validMounting,
  };

  const slatOptions = slatOptionsForSystem(productCode, next);
  if (!slatOptions.map(String).includes(String(next.slat_size_mm))) {
    next = { ...next, slat_size_mm: slatOptions[0] };
  }

  const previousColour = String(next.colour_code ?? "");
  const previousPostColour = String(next.post_colour_code ?? previousColour);
  const colourOptions = colourOptionsForSystem(next);
  if (!colourOptions.includes(String(next.colour_code))) {
    next = { ...next, colour_code: colourOptions[0] };
  }

  const postColourOptions = postColourOptionsForSystem(next);
  const keepPostMatchedToFence =
    !next.post_colour_code || previousPostColour === previousColour;
  const postColour = keepPostMatchedToFence
    ? String(next.colour_code)
    : String(next.post_colour_code ?? next.colour_code);
  if (keepPostMatchedToFence && next.post_colour_code !== next.colour_code) {
    next = { ...next, post_colour_code: String(next.colour_code) };
  }
  if (!postColourOptions.includes(postColour)) {
    next = {
      ...next,
      post_colour_code: postColourOptions.includes(String(next.colour_code))
        ? String(next.colour_code)
        : "MN",
    };
  }

  const gapOptions = gapOptionsForSystem(productCode);
  const customGapMode = productCode === "QSHS" && next.slat_gap_mode === "custom";
  if (customGapMode) {
    const gap = Number(next.slat_gap_mm);
    next = {
      ...next,
      slat_gap_mode: "custom",
      slat_gap_mm: Number.isFinite(gap) && gap >= 0 ? Math.round(gap) : 5,
    };
  } else if (gapOptions.length > 0) {
    next = { ...next, slat_gap_mode: "spacer" };
    if (!gapOptions.map(String).includes(String(next.slat_gap_mm))) {
      next = { ...next, slat_gap_mm: gapOptions[0] };
    }
  } else {
    const gap = Number(next.slat_gap_mm);
    next = { ...next, slat_gap_mm: Number.isFinite(gap) && gap >= 0 ? Math.round(gap) : 0 };
  }

  const maxPanelWidth = maxPanelWidthForSystem(productCode);
  const panelWidth = Number(next.max_panel_width_mm);
  next = {
    ...next,
    max_panel_width_mm:
      Number.isFinite(panelWidth) && panelWidth > 0
        ? Math.min(maxPanelWidth, Math.max(300, panelWidth))
        : maxPanelWidth,
  };

  const heightOptions = heightOptionsForSystem(productCode, next);
  const requestedHeight = Number(next.target_height_mm ?? 1800);
  if (heightOptions.length > 0) {
    const closest = heightOptions.reduce((best, height) =>
      Math.abs(height - requestedHeight) < Math.abs(best - requestedHeight)
        ? height
        : best,
    );
    next = { ...next, target_height_mm: closest };
  }

  return next;
}

export function applyProductOptionRules(
  productCode: string,
  fields: SchemaField[],
  variables: Variables,
): SchemaField[] {
  const byKey = new Map(fields.map((field) => [field.field_key, field]));
  const finishField = optionField(
    productCode,
    "finish_family",
    "Slat range",
    finishOptionsForSystem(productCode),
    "standard",
    5,
  );

  const result: SchemaField[] = [finishField];

  for (const field of fields) {
    if (field.field_key.endsWith("_stock_length_mm")) continue;

    if (field.field_key === "colour_code") {
      result.push(
        cloneField(field, {
          options_json: colourOptionsForSystem(variables),
        }),
      );
      continue;
    }

    if (field.field_key === "post_colour_code") {
      result.push(
        cloneField(field, {
          options_json: postColourOptionsForSystem(variables),
        }),
      );
      continue;
    }

    if (field.field_key === "slat_size_mm") {
      result.push(
        cloneField(field, {
          options_json: slatOptionsForSystem(productCode, variables),
        }),
      );
      continue;
    }

    if (field.field_key === "slat_gap_mm") {
      const gapOptions = gapOptionsForSystem(productCode);
      if (productCode === "QSHS") {
        result.push(
          optionField(
            productCode,
            "slat_gap_mode",
            "Gap type",
            ["spacer", "custom"],
            "spacer",
            field.sort_order - 1,
          ),
        );
      }
      result.push(
        cloneField(field, {
          control_type:
            productCode === "QSHS" && variables.slat_gap_mode === "custom"
              ? "number"
              : gapOptions.length > 0
                ? "select"
                : "number",
          data_type: "number",
          options_json:
            productCode === "QSHS" && variables.slat_gap_mode === "custom"
              ? []
              : gapOptions,
          label:
            productCode === "QSHS" && variables.slat_gap_mode === "custom"
              ? "Custom slat gap"
              : productCode === "VS"
                ? "Slat gap"
                : field.label,
          unit: "mm",
        }),
      );
      continue;
    }

    if (field.field_key === "target_height_mm") {
      const heightOptions = heightOptionsForSystem(productCode, variables);
      result.push(
        cloneField(field, {
          control_type: heightOptions.length > 0 ? "select" : field.control_type,
          data_type: "number",
          options_json: heightOptions.length > 0 ? heightOptions : field.options_json,
          label: heightOptions.length > 0 ? "Actual fence height" : field.label,
          unit: "mm",
        }),
      );
      continue;
    }

    if (field.field_key === "mounting_type" || field.field_key === "mounting_method") {
      result.push(
        cloneField(field, {
          label: "Post mounting type",
          default_value_json: "in_ground",
          options_json: ["in_ground", "base_plate", "core_drill"],
        }),
      );
      continue;
    }

    if (field.field_key === "post_system") {
      result.push(
        cloneField(field, {
          label: "Post type",
          default_value_json: productCode === "XPL" ? "xpl" : "standard_50",
        }),
      );
      continue;
    }

    if (field.field_key === "post_size") {
      result.push(
        cloneField(field, {
          label: "Standard post size",
          default_value_json: "50",
        }),
      );
      continue;
    }

    if (field.field_key !== "finish_family") result.push(field);
  }

  if (!byKey.has("colour_code")) {
    result.push(
      optionField(
        productCode,
        "colour_code",
        "Colour",
        colourOptionsForSystem(variables),
        "B",
        10,
      ),
    );
  }

  result.push(
    optionField(
      productCode,
      "post_colour_code",
      "Post colour",
      postColourOptionsForSystem(variables),
      "B",
      25,
    ),
  );

  return result.sort((a, b) => a.sort_order - b.sort_order);
}
