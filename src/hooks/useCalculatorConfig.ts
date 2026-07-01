import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { UiCalculatorConfig } from "../types/calculatorConfig.types";
import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

const STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ALUMAWOOD_COLOURS = ["KWI", "WRC"];
const GATE_COLOURS = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"];

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin", MN: "Monument Matt", G: "Woodland Grey Matt", SM: "Surfmist Matt",
  W: "Pearl White Gloss", BS: "Basalt Satin", D: "Dune Satin", M: "Mill",
  P: "Primrose", PB: "Paperbark", S: "Palladium Silver Pearl", KWI: "Kwila", WRC: "Western Red Cedar",
};

/**
 * Minimal offline/error fallback — enough for the run/section forms to still
 * render (colour, slat size/gap, mounting) when `get-calculator-config` can't
 * be reached. Not a full mirror of the server config; the edge function is
 * the source of truth whenever Supabase is reachable.
 */
function fallbackConfig(productCode: string): UiCalculatorConfig {
  return {
    productCode,
    strategy: { fence: productCode === "VS" ? "vertical_slat" : productCode === "BAYG" ? "panel" : "horizontal_slat" },
    colours: {
      standard: STANDARD_COLOURS,
      alumawood: ALUMAWOOD_COLOURS,
      gate: GATE_COLOURS,
      names: COLOUR_NAMES,
      fallback: "MN",
    },
    panelRules: {
      maxPanelWidthMm: productCode === "BAYG" ? 3000 : 2600,
      minPostSpacingMm: 100,
      maxPostSpacingMm: 3000,
    },
    postRules: { longPostThresholdMm: 2400 },
    defaults: {
      slatSizeMm: 65,
      slatGapMm: productCode === "VS" ? 20 : 9,
      targetHeightMm: 1800,
      postSizeMm: 50,
      finishFamily: "standard",
      colour: "B",
      mountingType: "in_ground",
    },
    formFields: {
      job: [],
      run: [],
      segment:
        productCode === "BAYG"
          ? [
              {
                id: "panel_quantity",
                field_key: "panel_quantity",
                label: "Quantity",
                control_type: "number",
                data_type: "integer",
                required: false,
                default_value_json: 1,
                options_json: [],
                visible_when_json: {},
                sort_order: 10,
              },
            ]
          : [],
    },
  };
}

function normaliseField(raw: Partial<SchemaField> & { field_key: string }): SchemaField {
  return {
    id: raw.id ?? raw.field_key,
    field_key: raw.field_key,
    label: raw.label ?? raw.field_key,
    control_type: raw.control_type ?? "text",
    data_type: raw.data_type ?? "string",
    unit: raw.unit,
    required: raw.required ?? false,
    default_value_json: raw.default_value_json,
    options_json: Array.isArray(raw.options_json) ? raw.options_json : [],
    visible_when_json: raw.visible_when_json ?? {},
    sort_order: raw.sort_order ?? 0,
    options_group: raw.options_group,
  };
}

function normaliseConfig(raw: UiCalculatorConfig): UiCalculatorConfig {
  return {
    ...raw,
    formFields: {
      job: (raw.formFields?.job ?? []).map(normaliseField),
      run: (raw.formFields?.run ?? []).map(normaliseField),
      segment: (raw.formFields?.segment ?? []).map(normaliseField),
    },
  };
}

/**
 * Fetches the merged (base + supplier override), UI-safe projection of
 * CalculatorConfig for a product via the `get-calculator-config` edge
 * function. Single source of truth for form field definitions and option
 * lists in the v3 calculator — do not hand-maintain a client copy of
 * config/base.ts (see docs on the backend-driven-forms plan).
 *
 * Cached by TanStack Query with key ['calculator-config', productCode].
 */
export function useCalculatorConfig(productCode: string): UiCalculatorConfig {
  const fallback = fallbackConfig(productCode);

  const query = useQuery({
    queryKey: ["calculator-config", productCode],
    enabled: isSupabaseConfigured && !!productCode,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UiCalculatorConfig> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn(
          `[useCalculatorConfig] No authenticated session — using hardcoded fallback for ${productCode}. Form fields will be limited.`,
        );
        return fallback;
      }

      const { data, error } = await supabase.functions.invoke("get-calculator-config", {
        body: { productCode },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data || typeof data !== "object") {
        console.error(
          `[useCalculatorConfig] get-calculator-config failed for ${productCode} — using hardcoded fallback. Form fields will be limited.`,
          error ?? data,
        );
        return fallback;
      }
      return normaliseConfig(data as UiCalculatorConfig);
    },
  });

  return query.data ?? fallback;
}
