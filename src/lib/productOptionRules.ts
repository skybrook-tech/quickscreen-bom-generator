import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

type Variables = Record<string, string | number | boolean>;

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const ECONOMY_COLOURS = ["B", "MN", "SM"];

const SYSTEM_MAX_PANEL_WIDTH: Record<string, number> = {
  QSHS: 3000,
  VS: 2600,
  XPL: 3000,
  BAYG: 2600,
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
  if (productCode === "BAYG") return ["standard", "alumawood"];
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
  if (productCode === "XPL") return [9, 20];
  if (productCode === "QSHS") return [5, 9, 12, 15, 20, 30];
  return [];
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
    slat_gap_mm: productCode === "XPL" ? 9 : 5,
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
  if (gapOptions.length > 0) {
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
      result.push(
        cloneField(field, {
          control_type: gapOptions.length > 0 ? "select" : "number",
          data_type: "number",
          options_json: gapOptions,
          label: productCode === "VS" ? "Slat gap" : field.label,
          unit: "mm",
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
