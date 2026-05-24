import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveJobDialog } from "./SaveJobDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SaveJobDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("pre-fills the editable job name", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <SaveJobDialog
          initialName="Smith boundary screen"
          onCancel={() => undefined}
          onSave={() => true}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>("input");
    expect(input?.value).toBe("Smith boundary screen");

    act(() => root.unmount());
  });

  it("submits the edited name through the existing save callback", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSave = vi.fn(async () => true);

    act(() => {
      root.render(
        <SaveJobDialog
          initialName="Original name"
          onCancel={() => undefined}
          onSave={onSave}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>("input");
    const form = container.querySelector<HTMLFormElement>("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        input,
        "Edited install name",
      );
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(onSave).toHaveBeenCalledWith("Edited install name");

    act(() => root.unmount());
  });
});
