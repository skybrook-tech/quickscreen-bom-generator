import type { CanonicalPayload, CanonicalRun } from "../types/canonical.types";
import type { BOMLineItem, ExtraItem } from "../types/bom.types";
import { getComponent } from "./localSeedData";
import { maxPanelWidthForSystem } from "./productOptionRules";

type Variables = Record<string, string | number | boolean | undefined>;

export type SuggestedAccessory = ExtraItem & {
  category: "fixing" | "finish" | "post_accessory" | "catalogue_gap";
  reason: string;
  priced: boolean;
};

const POST_COLOURS = new Set([
  "B",
  "MN",
  "G",
  "SM",
  "W",
  "BS",
  "D",
  "M",
  "P",
  "PB",
  "S",
]);

const roundQty = (value: number) => Math.max(1, Math.ceil(value));

function postCountForRun(run: CanonicalRun) {
  const runVars = run.variables ?? {};
  const baseMaxPanelWidth = Math.min(
    maxPanelWidthForSystem(run.productCode),
    Math.max(300, Number(runVars.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode))),
  );
  const internalPosts = run.segments
    .filter((segment) => segment.segmentKind !== "gate_opening")
    .reduce((sum, segment) => {
      const maxPanelWidth = Math.min(
        maxPanelWidthForSystem(run.productCode),
        Math.max(
          300,
          Number(segment.variables?.max_panel_width_mm ?? baseMaxPanelWidth),
        ),
      );
      const panels = Math.max(
        1,
        Math.ceil(Number(segment.segmentWidthMm ?? 0) / maxPanelWidth),
      );
      return sum + Math.max(0, panels - 1);
    }, 0);

  return internalPosts + (
    (run.leftBoundary.type === "product_post" ? 1 : 0) +
    (run.rightBoundary.type === "product_post" ? 1 : 0) +
    run.corners.length
  );
}

function mergedVars(payload: CanonicalPayload, run: CanonicalRun): Variables {
  return { ...payload.variables, ...(run.variables ?? {}) };
}

function componentSuggestion(
  sku: string,
  quantity: number,
  category: SuggestedAccessory["category"],
  reason: string,
  fallbackDescription: string,
): SuggestedAccessory {
  const component = getComponent(sku);
  return {
    id: `suggested-${sku}`,
    sku,
    description: component?.description ?? component?.name ?? fallbackDescription,
    quantity: roundQty(quantity),
    unitPrice: component?.default_price ?? 0,
    category,
    reason,
    priced: typeof component?.default_price === "number",
  };
}

function genericSuggestion(
  id: string,
  description: string,
  quantity: number,
  category: SuggestedAccessory["category"],
  reason: string,
): SuggestedAccessory {
  return {
    id: `suggested-${id}`,
    sku: id,
    description,
    quantity: roundQty(quantity),
    unitPrice: 0,
    category,
    reason,
    priced: false,
  };
}

function postColourFromVars(vars: Variables) {
  const explicitPostColour = String(vars.post_colour_code ?? "");
  if (POST_COLOURS.has(explicitPostColour)) return explicitPostColour;

  const fenceColour = String(vars.colour_code ?? vars.colour ?? "B");
  return POST_COLOURS.has(fenceColour) ? fenceColour : "MN";
}

function hasBomSku(bomSkus: Set<string>, sku: string) {
  return bomSkus.has(sku);
}

export function suggestAccessories(
  payload: CanonicalPayload,
  bomLines: BOMLineItem[],
): SuggestedAccessory[] {
  const suggestions: SuggestedAccessory[] = [];
  const bomSkus = new Set(bomLines.map((line) => line.sku));

  for (const run of payload.runs) {
    const vars = mergedVars(payload, run);
    const postCount = postCountForRun(run);
    if (postCount <= 0) continue;

    const mountingType = String(
      vars.mounting_type ?? vars.mounting_method ?? "in_ground",
    );
    const postSize = Number(vars.post_size ?? 50);
    const postColour = postColourFromVars(vars);

    if (mountingType === "in_ground") {
      suggestions.push(
        genericSuggestion(
          `rapid-set-${run.runId}`,
          "Rapid set concrete bag",
          postCount * 1.5,
          "fixing",
          "Suggested at 1.5 bags per concreted-in post.",
        ),
      );
    }

    if (mountingType === "core_drill") {
      const dressRingSku =
        postSize === 65 ? `XP-65DR-${postColour}` : `XP-DR-${postColour}`;
      if (!hasBomSku(bomSkus, dressRingSku)) {
        suggestions.push(
          componentSuggestion(
            dressRingSku,
            postCount,
            "post_accessory",
            "Dress rings suit core-drilled posts.",
            "Core-drill dress ring",
          ),
        );
      }
      suggestions.push(
        genericSuggestion(
          `core-grout-${run.runId}`,
          "Core drill grout or high-strength non-shrink grout",
          postCount,
          "fixing",
          "Choose the grout product and quantity to suit the substrate and hole size.",
        ),
      );
    }

    if (mountingType === "base_plate") {
      const basePlateSku =
        postSize === 65
          ? `XP-65BP-SET-${postColour}`
          : `XP-BP-SET-${postColour}`;
      const coverSku =
        postSize === 65
          ? `XP-65DC-2P-${postColour}`
          : `XP-DC-2P-${postColour}`;

      if (!hasBomSku(bomSkus, basePlateSku)) {
        suggestions.push(
          componentSuggestion(
            basePlateSku,
            postCount,
            "post_accessory",
            "Base plate sets suit base-plate-mounted posts.",
            "Base plate set",
          ),
        );
      }
      if (!hasBomSku(bomSkus, coverSku)) {
        suggestions.push(
          componentSuggestion(
            coverSku,
            postCount,
            "post_accessory",
            "Cover rings tidy up base-plate-mounted posts.",
            "Base plate cover ring",
          ),
        );
      }
      suggestions.push(
        genericSuggestion(
          `base-plate-fixings-${run.runId}`,
          "Base plate masonry fixing / anchor pack",
          postCount,
          "fixing",
          "Select fixing type to suit concrete, masonry, steel, or timber substrate.",
        ),
      );
    }
  }

  const finishColours = new Set<string>();
  const fenceColour = String(payload.variables.colour_code ?? "B");
  finishColours.add(fenceColour);
  const postColour = postColourFromVars(payload.variables);
  finishColours.add(postColour);

  for (const colour of finishColours) {
    const sku = `PAINT-${colour}`;
    suggestions.push(
      componentSuggestion(
        sku,
        1,
        "finish",
        "Suggested for colour-matched touch-ups after cutting and installation.",
        `Touch up paint - ${colour}`,
      ),
    );
  }

  const deduped = new Map<string, SuggestedAccessory>();
  for (const suggestion of suggestions) {
    const key = suggestion.sku ?? suggestion.id;
    const existing = deduped.get(key);
    if (existing) {
      deduped.set(key, {
        ...existing,
        quantity: existing.quantity + suggestion.quantity,
      });
    } else {
      deduped.set(key, suggestion);
    }
  }

  return [...deduped.values()];
}
