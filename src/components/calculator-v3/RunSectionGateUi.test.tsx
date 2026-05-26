import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import { initialVariablesForSystem } from "../../lib/productOptionRules";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { InlineHeightEditor } from "./InlineHeightEditor";
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

const variableMock = vi.hoisted(() => {
  const field = (
    field_key: string,
    label: string,
    options_json: Array<string | number>,
    default_value_json: string | number,
    sort_order: number,
  ) => ({
    id: `${field_key}-field`,
    field_key,
    label,
    control_type: "select",
    data_type: typeof default_value_json === "number" ? "number" : "enum",
    required: true,
    default_value_json,
    options_json,
    visible_when_json: {},
    sort_order,
  });
  return {
    jobFields: [
      field("colour_code", "Colour", ["B", "MN", "SM"], "B", 10),
      field("post_colour_code", "Post colour", ["B", "MN", "SM"], "B", 20),
      field("slat_size_mm", "Slat Size", [65, 90], 65, 30),
      field("slat_gap_mm", "Slat Gap", [5, 9, 20], 9, 40),
    ],
    runFields: [
      field("post_system", "Post size", ["standard_50", "standard_65"], "standard_50", 10),
      field("post_size", "Standard post size", [50, 65], 50, 20),
      field("mounting_method", "Post mounting type", ["in_ground", "base_plate", "core_drill"], "in_ground", 30),
      field("max_panel_width_mm", "Max Post Spacing", [2000, 2600], 2600, 40),
    ],
  };
});

vi.mock("../../context/CalculatorContext", () => ({
  useCalculator: () => ({
    state: contextMock.state,
    dispatch: contextMock.dispatch,
  }),
}));

vi.mock("../../hooks/useProductVariables", () => ({
  useProductVariables: (_productCode: string, scope: "job" | "run") => ({
    data: scope === "job" ? variableMock.jobFields : variableMock.runFields,
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

  it("defaults VS runs to 1800mm", () => {
    expect(initialVariablesForSystem("VS").target_height_mm).toBe(1800);
  });

  it("orders run slat settings and keeps alternate post colour out of post settings", () => {
    const run: CanonicalRun = {
      ...baseRun,
      variables: {
        ...baseRun.variables,
        post_colour_code: "MN",
      },
    };
    setPayload(run);
    const { container, root } = render(<RunSettingsEditor run={run} />);
    const text = (container.textContent ?? "").toLowerCase();

    const slatRange = text.indexOf("slat range");
    const colour = text.indexOf("colour");
    const altPost = text.indexOf("alternate post colour");
    const slatSize = text.indexOf("slat size");
    const slatGap = text.indexOf("slat gap");
    const postSettings = text.indexOf("post size, mounting and spacing");

    expect(slatRange).toBeGreaterThanOrEqual(0);
    expect(slatRange).toBeLessThan(colour);
    expect(colour).toBeLessThan(altPost);
    expect(altPost).toBeLessThan(slatSize);
    expect(slatSize).toBeLessThan(slatGap);
    expect(altPost).toBeLessThan(postSettings);
    expect(text).not.toContain("finish");

    cleanup(root, container);
  });

  it("matches the section slat settings order", () => {
    const segment: CanonicalSegment = {
      segmentId: "seg-1",
      sortOrder: 1,
      segmentKind: "panel",
      segmentWidthMm: 3000,
      targetHeightMm: 1800,
      variables: {
        post_colour_code: "MN",
      },
    };
    const run = { ...baseRun, segments: [segment] };
    setPayload(run);
    const { container, root } = render(<FenceSegmentDetails runId={run.runId} seg={segment} />);
    const text = (container.textContent ?? "").toLowerCase();

    const slatRange = text.indexOf("slat range");
    const colour = text.indexOf("colour");
    const altPost = text.indexOf("alternate post colour");
    const slatSize = text.indexOf("slat size");
    const slatGap = text.indexOf("slat gap");
    const postSettings = text.indexOf("post size, mounting and spacing");

    expect(slatRange).toBeGreaterThanOrEqual(0);
    expect(slatRange).toBeLessThan(colour);
    expect(colour).toBeLessThan(altPost);
    expect(altPost).toBeLessThan(slatSize);
    expect(slatSize).toBeLessThan(slatGap);
    expect(altPost).toBeLessThan(postSettings);
    expect(text).not.toContain("finish");

    cleanup(root, container);
  });

  it("renders compact section cards with inline geometry and settings controls", () => {
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
      />,
    );

    expect(container.textContent).toContain("Section 1");
    expect(container.textContent).toContain("QuickScreen Horizontal Slat");
    expect(container.textContent).toContain("Length");
    expect(container.textContent).toContain("Height");
    expect(container.textContent).toContain("Slats");
    expect(container.textContent).toContain("Posts");
    expect(container.textContent).not.toContain("Section Settings");
    expect(container.textContent).not.toContain("Colour: Surfmist Matt");

    cleanup(root, container);
  });

  it("renders compact gate cards with matching inline controls", () => {
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
      />,
    );

    expect(container.textContent).toContain("Gate 1");
    expect(container.textContent).toContain("QuickScreen Horizontal Slat");
    expect(container.textContent).toContain("Width");
    expect(container.textContent).toContain("Height");
    expect(container.textContent).toContain("Gate");
    expect(container.textContent).toContain("Slats");
    expect(container.textContent).not.toContain("Gate Settings");

    cleanup(root, container);
  });

  it("requires explicit confirmation before removing a run", () => {
    setPayload(baseRun);
    const { container, root } = render(<RunCard run={baseRun} runIdx={0} />);

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Remove run 1"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(contextMock.dispatch).not.toHaveBeenCalledWith({
      type: "REMOVE_RUN",
      runId: baseRun.runId,
    });
    expect(container.textContent).toContain("Remove this run?");

    act(() => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent === "Cancel")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(contextMock.dispatch).not.toHaveBeenCalledWith({
      type: "REMOVE_RUN",
      runId: baseRun.runId,
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Remove run 1"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent === "Remove")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(contextMock.dispatch).toHaveBeenCalledWith({
      type: "REMOVE_RUN",
      runId: baseRun.runId,
    });

    cleanup(root, container);
  });
});
