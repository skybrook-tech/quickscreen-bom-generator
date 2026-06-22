import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import { InlineHeightEditor } from "./InlineHeightEditor";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { RunCard } from "./RunCard";
import { RunSettingsEditor } from "./RunSettingsEditor";
import { SegmentRow } from "./SegmentRow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const contextMock = vi.hoisted(() => ({
  state: {
    payload: null as CanonicalPayload | null,
    entryMethod: null,
    bomResult: null as Record<string, unknown> | null,
  },
  dispatch: vi.fn(),
}));

const productVariablesMock = vi.hoisted(() => {
  const field = (
    fieldKey: string,
    label: string,
    controlType: string,
    dataType: string,
    defaultValue: unknown,
    options: unknown[],
    sortOrder: number,
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
  });

  const jobFields = [
    field("colour_code", "Colour", "select", "enum", "B", ["B", "SM"], 10),
    field("post_colour_code", "Post colour", "select", "enum", "B", ["B", "SM"], 11),
    field("slat_size_mm", "Slat size", "select", "number", 65, [65, 90], 20),
    field("slat_gap_mm", "Slat gap", "select", "number", 9, [5, 9, 20], 30),
  ];
  const runFields = [
    field("post_system", "Post size", "select", "enum", "standard_50", ["standard_50", "standard_65"], 40),
    field("post_size", "Standard post size", "select", "number", 50, [50, 65], 41),
    field("mounting_method", "Post mounting type", "select", "enum", "in_ground", ["in_ground", "base_plate", "core_drill"], 50),
    field("max_panel_width_mm", "Max Post Spacing", "number", "number", 2600, [], 60),
  ];

  return {
    useProductVariables: vi.fn((_productCode: string, scope: string) => ({
      data: scope === "run" ? runFields : jobFields,
    })),
  };
});

vi.mock("../../context/CalculatorContext", () => ({
  useCalculator: () => ({
    state: contextMock.state,
    dispatch: contextMock.dispatch,
  }),
}));

vi.mock("../../hooks/useProductVariables", () => ({
  useProductVariables: productVariablesMock.useProductVariables,
}));

vi.mock("../../hooks/useProducts", () => ({
  useProducts: () => ({
    data: [
      { id: "qshs-id", system_type: "QSHS" },
      { id: "vs-id", system_type: "VS" }
    ],
  }),
}));

vi.mock("../../context/ProfileContext", () => ({
  useProfile: () => ({
    isAdmin: true,
  }),
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

function disclosureRow(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  return button!.parentElement as HTMLElement;
}

const baseRun: CanonicalRun = {
  runId: "run-1",
  productCode: "QSHS",
  variables: {
    target_height_mm: 1800,
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

    expect(container.textContent).toContain("QuickScreen Horizontal Slat");
    expect(container.textContent).toContain("Run Settings");
    expect(
      container.querySelector('[aria-label="Run 1 default height"]')?.tagName,
    ).toBe("SELECT");

    cleanup(root, container);
  });

  it("renders inline height dropdowns for horizontal systems and number input for VS", () => {
    const qshs = render(
      <InlineHeightEditor
        productCode="QSHS"
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
        productCode="VS"
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
      targetHeightMm: 1800,
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

  it("places alternate post colour inside the run slats and colours dropdown", () => {
    setPayload(baseRun);
    const { container, root } = render(<RunSettingsEditor run={baseRun} />);

    const slatsRow = disclosureRow(container, "Slats, colors, and spacings");
    const postsRow = disclosureRow(container, "Post size, mounting and spacing");

    expect(slatsRow.textContent).toContain("Alternate post colour");
    expect(postsRow.textContent).not.toContain("Alternate post colour");

    cleanup(root, container);
  });

  it("mirrors run dropdown grouping in section settings", () => {
    const segment: CanonicalSegment = {
      segmentId: "seg-1",
      sortOrder: 1,
      segmentKind: "panel",
      segmentWidthMm: 3000,
      targetHeightMm: 1800,
      variables: {},
    };
    const run = { ...baseRun, segments: [segment] };
    setPayload(run);
    const { container, root } = render(
      <FenceSegmentDetails runId={run.runId} seg={segment} />,
    );

    const slatsRow = disclosureRow(container, "Slats, colors, and spacings");
    const postsRow = disclosureRow(container, "Post size, mounting and spacing");

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
      targetHeightMm: 1800,
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
