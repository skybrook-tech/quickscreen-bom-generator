// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import type { UiCalculatorConfig } from "../../types/calculatorConfig.types";
import { localFenceProducts } from "../../lib/localSeedData";
import { InlineHeightEditor } from "./RunCard/InlineHeightEditor";
import { FenceSegmentDetails } from "./RunCard/FenceSegmentDetails";
import { RunCard } from "./RunCard/RunCard";
import { RunCardSettings } from "./RunCard/RunCardSettings";
import { SegmentRow } from "./RunCard/SegmentRow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const contextMock = vi.hoisted(() => ({
  state: {
    payload: null as CanonicalPayload | null,
    entryMethod: null,
    bomResult: null as Record<string, unknown> | null,
  },
  dispatch: vi.fn(),
}));

const calculatorConfigMock = vi.hoisted(() => {
  const field = (
    fieldKey: string,
    label: string,
    controlType: string,
    dataType: string,
    defaultValue: unknown,
    options: unknown[],
    sortOrder: number,
    group: string | undefined,
    settingsFor: ("run" | "segment")[] = ["run", "segment"],
  ) => ({
    id: `${fieldKey}-field`,
    field_key: fieldKey,
    label,
    control_type: controlType,
    data_type: dataType,
    required: true,
    default_value_json: defaultValue,
    options_json: options,
    visible_when_json: {},
    sort_order: sortOrder,
    group,
    settings_for: settingsFor,
  });

  // v3: a single flat fields[] array. Former job+run fields are
  // settings_for ["run","segment"] (run default + segment override).
  const fields = [
    field("finish_family", "Slat range", "select", "enum", "standard", ["standard", "economy", "alumawood"], 5, "slats_colours"),
    field("colour_code", "Colour", "select", "enum", "B", ["B", "SM"], 10, "slats_colours"),
    field("post_colour_code", "Post colour", "colour_palette_optional", "enum", "B", ["B", "SM"], 11, "slats_colours"),
    field("slat_size_mm", "Slat size", "select", "number", 65, [65, 90], 20, "slats_colours"),
    field("slat_gap_mm", "Slat gap", "select", "number", 9, [5, 9, 20], 30, "slats_colours"),
    field("post_system", "Post size", "select", "enum", "standard_50", ["standard_50", "standard_65"], 40, "posts_mounting"),
    field("post_size", "Standard post size", "select", "number", 50, [50, 65], 41, "posts_mounting"),
    field("mounting_method", "Post mounting type", "select", "enum", "in_ground", ["in_ground", "base_plate", "core_drill"], 50, "posts_mounting"),
    field("max_panel_width_mm", "Max Post Spacing", "number", "number", 2600, [], 60, "posts_mounting"),
  ];

  const baseConfig: UiCalculatorConfig = {
    productCode: "QSHS",
    display: { name: "QuickScreen Horizontal Slat", shortName: "Horizontal Slats", description: "Quick Screen Horizontal Slats" },
    strategy: { fence: "horizontal_slat" },
    colours: { standard: ["B", "SM"], economy: ["B", "SM"], alumawood: [], gate: ["B", "SM"], names: {}, swatches: {}, fallback: "MN" },
    finishFamilies: ["standard", "economy", "alumawood"],
    panelRules: { maxPanelWidthMm: 2600, minPostSpacingMm: 100, maxPostSpacingMm: 3000 },
    defaults: {
      targetHeightMm: 1800,
      colour: "B",
      mountingType: "in_ground",
    },
    fields,
    formGroups: [
      { key: "slats_colours", label: "Slats, colours and spacings", sort_order: 20 },
      { key: "posts_mounting", label: "Post size, mounting and spacing", sort_order: 30 },
    ],
    postFixingMaterials: [
      { sku: "GROUT-RSC", label: "Rapid set concrete", description: "20kg bag" },
    ],
    gapRules: { allowCustom: true, customMinMm: 1, customMaxMm: 50 },
    heightUi: { mode: "ladder" },
    heightLadder: {
      slatHeightDeductionMm: 3,
      entries: [{ N: 20, height: 1808 }],
    },
    gateRules: {
      maxWidthMm: {
        pedestrianHorizontal: 2100,
        pedestrianVertical: 2100,
        slidingHorizontal: 6150,
        slidingVertical: 6166,
      },
      doubleSwingMaxLeafWidthMm: 2100,
      supported: true,
      defaultInfill: "horizontal",
      gateProductCode: "QS_GATE",
    },
    normalisedVariables: {
      finish_family: "standard",
      colour_code: "B",
      post_colour_code: "B",
      slat_size_mm: 65,
      slat_gap_mm: 9,
      slat_gap_mode: "spacer",
      post_system: "standard_50",
      post_size: 50,
      mounting_type: "in_ground",
      mounting_method: "in_ground",
      max_panel_width_mm: 2600,
      target_height_mm: 1808,
      slat_count: 20,
    },
  };

  const vsConfig: UiCalculatorConfig = {
    ...baseConfig,
    productCode: "VS",
    display: { name: "Vertical Slat", shortName: "Vertical Slats", description: "Vertical Slats" },
    heightUi: { mode: "freeform", freeformMinMm: 300, freeformMaxMm: 2400, freeformStepMm: 50 },
    heightLadder: { slatHeightDeductionMm: 3, entries: [] },
  };

  return { baseConfig, vsConfig };
});

vi.mock("../../context/CalculatorContext", () => ({
  useCalculator: () => ({
    state: contextMock.state,
    dispatch: contextMock.dispatch,
  }),
}));

vi.mock("../../hooks/useCalculatorConfig", () => ({
  useCalculatorConfig: vi.fn((productCode: string) =>
    productCode === "VS" ? calculatorConfigMock.vsConfig : calculatorConfigMock.baseConfig,
  ),
  useCalculatorConfigQuery: vi.fn((productCode: string) => ({
    data: productCode === "VS" ? calculatorConfigMock.vsConfig : calculatorConfigMock.baseConfig,
    isFetching: false,
  })),
}));

vi.mock("../../hooks/useProducts", () => ({
  useFenceProducts: () => ({ data: localFenceProducts }),
}));

function render(ui: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

function cleanup(root?: Root, container?: HTMLElement) {
  if (root) act(() => root.unmount());
  container?.remove();
}

function groupSection(container: HTMLElement, label: string): HTMLElement {
  const h4 = Array.from(container.querySelectorAll("h4")).find((item) =>
    item.textContent?.includes(label),
  );
  expect(h4).toBeTruthy();
  return h4!.parentElement as HTMLElement;
}

const baseRun: CanonicalRun = {
  runId: "run-1",
  productCode: "QSHS",
  variables: {
    target_height_mm: 1808,
    slat_size_mm: 65,
    slat_gap_mm: 9,
    colour_code: "B",
    post_colour_code: "B",
    post_system: "standard_50",
    post_size: 50,
    mounting_method: "in_ground",
    max_panel_width_mm: 2600,
  },
  segments: [],
};

function setPayload(run: CanonicalRun) {
  contextMock.state = {
    payload: {
      productCode: run.productCode,
      schemaVersion: "v1",
      variables: {},
      runs: [run],
    },
    entryMethod: null,
    bomResult: null,
  };
}

describe("Run, section, and gate UI consistency", () => {
  afterEach(() => {
    contextMock.dispatch.mockClear();
    document.body.innerHTML = "";
    contextMock.state = {
      payload: null,
      entryMethod: null,
      bomResult: null,
    };
  });

  it("renders the full system display name and labeled run settings button", () => {
    setPayload(baseRun);
    const { container, root } = render(<RunCard run={baseRun} runIdx={0} />);

    expect(container.textContent).toContain("Horizontal Slats");
    expect(container.textContent).toContain("Run Settings");
    expect(
      container.querySelector('[aria-label="Run 1 default height"]')?.tagName,
    ).toBe("SELECT");

    cleanup(root, container);
  });

  it("renders inline height dropdowns for ladder systems and number input for freeform", () => {
    const qshs = render(
      <InlineHeightEditor
        config={calculatorConfigMock.baseConfig}
        variables={{ slat_size_mm: 65, slat_gap_mm: 9 }}
        valueMm={1808}
        ariaLabel="QSHS height"
        onChange={() => undefined}
      />,
    );
    expect(qshs.container.querySelector("select")).not.toBeNull();
    cleanup(qshs.root, qshs.container);

    const vs = render(
      <InlineHeightEditor
        config={calculatorConfigMock.vsConfig}
        variables={{ slat_size_mm: 65, slat_gap_mm: 9 }}
        valueMm={1800}
        ariaLabel="VS height"
        onChange={() => undefined}
      />,
    );
    expect(vs.container.querySelector("input[type='number']")).not.toBeNull();
    cleanup(vs.root, vs.container);
  });

  it("shows only changed section settings in the closed subheading", () => {
    const segment: CanonicalSegment = {
      segmentId: "seg-1",
      sortOrder: 1,
      segmentKind: "panel",
      segmentWidthMm: 3000,
      targetHeightMm: 1808,
      variables: {
        colour_code: "SM",
        slat_gap_mm: 20,
      },
    };
    const run = { ...baseRun, segments: [segment] };
    setPayload(run);
    const { container, root } = render(
      <SegmentRow
        runId={run.runId}
        seg={segment}
        segIdx={0}
        runIdx={0}
        open={false}
        onToggle={() => undefined}
      />,
    );

    expect(container.textContent).toContain("Section Settings");
    expect(container.textContent).toContain("Colour: Surfmist Matt");
    expect(container.textContent).toContain("Gap: 20mm");
    expect(container.textContent).not.toContain("Post: 50mm Post Standard");

    cleanup(root, container);
  });

  it("flags a segment-level system override in the closed subheading", () => {
    const segment: CanonicalSegment = {
      segmentId: "seg-vs",
      sortOrder: 1,
      segmentKind: "panel",
      segmentWidthMm: 3000,
      targetHeightMm: 1808,
      variables: {
        product_code: "VS",
      },
    };
    const run = { ...baseRun, segments: [segment] };
    setPayload(run);
    const { container, root } = render(
      <SegmentRow
        runId={run.runId}
        seg={segment}
        segIdx={0}
        runIdx={0}
        open={false}
        onToggle={() => undefined}
      />,
    );

    expect(container.textContent).toContain("System: VS");

    cleanup(root, container);
  });

  it("places alternate post colour inside the run slats and colours group", () => {
    setPayload(baseRun);
    const { container, root } = render(
      <RunCardSettings run={baseRun} />,
    );

    const slatsRow = groupSection(container, "Slats, colours and spacings");
    const postsRow = groupSection(container, "Post size, mounting and spacing");

    expect(slatsRow.textContent).toContain("Alternate post colour");
    expect(postsRow.textContent).not.toContain("Alternate post colour");

    cleanup(root, container);
  });

  it("mirrors run group layout in section settings", () => {
    const segment: CanonicalSegment = {
      segmentId: "seg-1",
      sortOrder: 1,
      segmentKind: "panel",
      segmentWidthMm: 3000,
      targetHeightMm: 1808,
      variables: {},
    };
    const run = { ...baseRun, segments: [segment] };
    setPayload(run);
    const { container, root } = render(
      <FenceSegmentDetails runId={run.runId} seg={segment} />,
    );

    const slatsRow = groupSection(container, "Slats, colours and spacings");
    const postsRow = groupSection(container, "Post size, mounting and spacing");

    expect(slatsRow.textContent).toContain("Alternate post colour");
    expect(slatsRow.textContent?.match(/Post colour/g) ?? []).toHaveLength(0);
    expect(postsRow.textContent).not.toContain("Alternate post colour");
    expect(postsRow.textContent).not.toContain("Post colour");
    expect(postsRow.textContent).not.toContain("Slat range");

    cleanup(root, container);
  });

  it("renders a labeled gate settings button", () => {
    const gate: CanonicalSegment = {
      segmentId: "gate-1",
      sortOrder: 2,
      segmentKind: "gate_opening",
      segmentWidthMm: 900,
      targetHeightMm: 1808,
      gateProductCode: "QS_GATE",
      variables: {},
    };
    const run = { ...baseRun, segments: [gate] };
    setPayload(run);
    const { container, root } = render(
      <SegmentRow
        runId={run.runId}
        seg={gate}
        segIdx={0}
        runIdx={0}
        open={false}
        onToggle={() => undefined}
      />,
    );

    expect(container.textContent).toContain("Gate Settings");

    cleanup(root, container);
  });
});
