// config/forms/fence.ts — job/run/segment form field defs for fence products
// (QSHS, VS, XPL, BAYG). Kept out of base.ts so that file stays readable.
//
// Many of these fields have their *options* recomputed live on the client by
// applyProductOptionRules() (finish family, slat size availability, colour
// lists, derived heights) — the definitions here supply field_key, label,
// control_type, defaults, sort order, and visible_when_json. That live
// filtering pass still owns "what can this field be right now" logic; this
// config owns "does this field exist, and what kind of control renders it".

import type { CalculatorConfig, FormFieldDef } from "../types.ts";

function jobFields(
  colours: string[],
  slatSizeOptions: number[],
  slatGapOptions: number[],
  finishFamilies: string[],
): FormFieldDef[] {
  return [
    {
      field_key: "finish_family",
      label: "Slat range",
      control_type: "select",
      data_type: "enum",
      options_json: finishFamilies,
      default_value_json: finishFamilies[0] ?? "standard",
      required: true,
      sort_order: 5,
    },
    {
      field_key: "colour_code",
      label: "Colour",
      control_type: "colour_palette",
      data_type: "enum",
      options_json: colours,
      default_value_json: colours[0] ?? "B",
      required: true,
      sort_order: 10,
    },
    {
      field_key: "slat_size_mm",
      label: "Slat Size",
      control_type: "select",
      data_type: "enum",
      unit: "mm",
      options_json: slatSizeOptions,
      default_value_json: slatSizeOptions[0] ?? 65,
      required: true,
      sort_order: 20,
      show_in_run_summary: true,
    },
    {
      field_key: "slat_gap_mm",
      label: "Slat gap",
      control_type: "combined_gap",
      data_type: "number",
      unit: "mm",
      options_json: slatGapOptions,
      default_value_json: slatGapOptions[0] ?? 9,
      required: true,
      sort_order: 30,
      show_in_run_summary: true,
    },
  ];
}

function runFields(opts: {
  includeLouvre: boolean;
  defaultPostSystem: string;
  panelStrategy: boolean;
}): FormFieldDef[] {
  return [
    {
      field_key: "mounting_type",
      label: "Post mounting type",
      control_type: "select",
      data_type: "enum",
      options_json: [
        { value: "in_ground", label: "Concreted in ground" },
        { value: "base_plate", label: "Base-plated to slab" },
        { value: "core_drill", label: "Core-drilled into concrete" },
      ],
      default_value_json: "in_ground",
      required: true,
      sort_order: 40,
      show_in_run_summary: true,
    },
    {
      field_key: "post_system",
      label: "Post size",
      control_type: "select",
      data_type: "enum",
      options_json: [
        { value: "standard_50", label: "50mm Post Standard" },
        { value: "standard_65", label: "65mm Post Standard HD" },
      ],
      default_value_json: opts.defaultPostSystem,
      sort_order: 42,
    },
    {
      field_key: "post_size",
      label: "Standard post size",
      control_type: "select",
      data_type: "enum",
      unit: "mm",
      options_json: [
        { value: "50", label: "50mm Post Standard" },
        { value: "65", label: "65mm Post Standard HD" },
      ],
      default_value_json: "50",
      sort_order: 45,
    },
    {
      field_key: "post_colour_code",
      label: "Post colour",
      control_type: "colour_palette",
      data_type: "enum",
      options_json: [],
      default_value_json: "B",
      sort_order: 47,
    },
    {
      field_key: "post_fixing_material_sku",
      label: "Post-fixing material",
      control_type: "post_fixing_select",
      data_type: "string",
      options_json: [],
      sort_order: 50,
    },
    {
      field_key: "base_plate_substrate",
      label: "Substrate",
      control_type: "select",
      data_type: "enum",
      options_json: ["concrete", "timber"],
      default_value_json: "concrete",
      visible_when_json: { mounting_type: "base_plate" },
      sort_order: 52,
    },
    {
      field_key: "max_panel_width_mm",
      label: opts.panelStrategy ? "Max Panel Spacing" : "Max Post Spacing",
      control_type: "number",
      data_type: "number",
      unit: "mm",
      default_value_json: 2600,
      sort_order: 60,
    },
    {
      field_key: "left_boundary_type",
      label: "Left Boundary",
      control_type: "select",
      data_type: "enum",
      options_json: ["post", "wall"],
      default_value_json: "post",
      sort_order: 70,
    },
    {
      field_key: "right_boundary_type",
      label: "Right Boundary",
      control_type: "select",
      data_type: "enum",
      options_json: ["post", "wall"],
      default_value_json: "post",
      sort_order: 80,
    },
    ...(opts.includeLouvre
      ? [
          {
            field_key: "louvre_treatment",
            label: "Louvre treatment",
            control_type: "toggle",
            data_type: "boolean",
            default_value_json: false,
            visible_when_json: { slat_size_mm: 65 },
            sort_order: 90,
          } satisfies FormFieldDef,
        ]
      : []),
  ];
}

function segmentFields(opts: { includePanelQuantity: boolean }): FormFieldDef[] {
  return opts.includePanelQuantity
    ? [
        {
          field_key: "panel_quantity",
          label: "Quantity",
          control_type: "number",
          data_type: "integer",
          default_value_json: 1,
          sort_order: 10,
        } satisfies FormFieldDef,
      ]
    : [];
}

export function fenceFormFields(
  productCode: string,
  colours: string[],
): CalculatorConfig["formFields"] {
  const slatSizeOptions = productCode === "XPL" ? [65] : [65, 90];
  const slatGapOptions = productCode === "QSHS" ? [5, 9, 12, 15, 20, 30] : [5, 9, 20];
  const finishFamilies =
    productCode === "XPL"
      ? ["standard", "alumawood"]
      : productCode === "BAYG"
        ? ["standard"]
        : ["standard", "economy", "alumawood"];
  return {
    job: jobFields(colours, slatSizeOptions, slatGapOptions, finishFamilies),
    run: runFields({
      includeLouvre: productCode === "QSHS",
      defaultPostSystem: productCode === "XPL" ? "xpl" : "standard_50",
      panelStrategy: productCode === "BAYG",
    }),
    segment: segmentFields({ includePanelQuantity: productCode === "BAYG" }),
  };
}
