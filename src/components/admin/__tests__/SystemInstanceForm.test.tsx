import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemInstanceForm } from "../SystemInstanceForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock ProfileContext so we don't need context provider wrapper
vi.mock("../../../context/ProfileContext", () => ({
  useProfile: () => ({
    user: { id: "test-user-id" },
    isAdmin: true,
    role: "admin",
    orgId: "test-org-id",
    isLoading: false,
  }),
}));

// Mock useQuery to return test suppliers and archetypes
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQuery: vi.fn().mockImplementation(({ queryKey }) => {
      if (queryKey.includes("suppliers")) {
        return {
          data: [
            { id: "d3b07384-d113-4956-a5cc-9430c25a0711", name: "Supplier One", slug: "supplier-one" },
            { id: "e4b07384-d113-4956-a5cc-9430c25a0722", name: "Supplier Two", slug: "supplier-two" },
          ],
          isLoading: false,
        };
      }
      if (queryKey.includes("archetypes")) {
        return {
          data: [
            { id: "a1b07384-d113-4956-a5cc-9430c25a0733", name: "Fence Archetype", family: "fence" },
            { id: "b2b07384-d113-4956-a5cc-9430c25a0744", name: "Gate Archetype", family: "gate" },
          ],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    }),
  };
});

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("SystemInstanceForm", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function renderForm(props: React.ComponentProps<typeof SystemInstanceForm>) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <SystemInstanceForm {...props} />
        </QueryClientProvider>
      );
    });

    return {
      container,
      root,
    };
  }

  it("renders form fields correctly", () => {
    const { container, root } = renderForm({
      onSubmit: async () => {},
    });

    expect(container.querySelector('[data-testid="instance-supplier-id"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-archetype-id"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-name"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-slug"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-description"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-status"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-readiness-status"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-trust-tier"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-visibility"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="instance-readiness-notes"]')).not.toBeNull();

    act(() => root.unmount());
  });

  it("auto-slugifies name input during creation", async () => {
    const { container, root } = renderForm({
      onSubmit: async () => {},
    });

    const nameInput = container.querySelector<HTMLInputElement>('[data-testid="instance-name"]');
    const slugInput = container.querySelector<HTMLInputElement>('[data-testid="instance-slug"]');

    expect(nameInput).not.toBeNull();
    expect(slugInput).not.toBeNull();

    await act(async () => {
      setInputValue(nameInput!, "My Slat Screening System");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(slugInput!.value).toBe("my-slat-screening-system");

    act(() => root.unmount());
  });

  it("surfaces validations for missing fields", async () => {
    const { container, root } = renderForm({
      onSubmit: async () => {},
    });

    const submitBtn = container.querySelector<HTMLButtonElement>('button[type="submit"]');

    await act(async () => {
      submitBtn!.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toContain("Please select a supplier");
    expect(container.textContent).toContain("Please select a system archetype");
    expect(container.textContent).toContain("Name is required");

    act(() => root.unmount());
  });

  it("calls onSubmit with correct fields on valid submission", async () => {
    let submittedData: any = null;
    const handleSubmit = async (data: any) => {
      submittedData = data;
    };

    const { container, root } = renderForm({
      initialData: {
        supplierId: "d3b07384-d113-4956-a5cc-9430c25a0711",
        archetypeId: "a1b07384-d113-4956-a5cc-9430c25a0733",
      },
      onSubmit: handleSubmit,
    });

    // Wait for queries to resolve and options to render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const nameInput = container.querySelector<HTMLInputElement>('[data-testid="instance-name"]');
    const slugInput = container.querySelector<HTMLInputElement>('[data-testid="instance-slug"]');
    const supplierSelect = container.querySelector<HTMLSelectElement>('[data-testid="instance-supplier-id"]');
    const archetypeSelect = container.querySelector<HTMLSelectElement>('[data-testid="instance-archetype-id"]');
    const submitBtn = container.querySelector<HTMLButtonElement>('button[type="submit"]');

    await act(async () => {
      setSelectValue(supplierSelect!, "d3b07384-d113-4956-a5cc-9430c25a0711");
      setSelectValue(archetypeSelect!, "a1b07384-d113-4956-a5cc-9430c25a0733");
      setInputValue(nameInput!, "My Brand New Instance");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await act(async () => {
      setInputValue(slugInput!, "my-brand-new-instance");
    });

    await act(async () => {
      submitBtn!.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const errElements = Array.from(container.querySelectorAll('.text-brand-danger')).filter(el => el.textContent !== '*');
    if (errElements.length > 0) {
      throw new Error("Validation errors found: " + errElements.map(el => el.textContent).join(", "));
    }

    expect(submittedData).not.toBeNull();
    expect(submittedData.supplierId).toBe("d3b07384-d113-4956-a5cc-9430c25a0711");
    expect(submittedData.archetypeId).toBe("a1b07384-d113-4956-a5cc-9430c25a0733");
    expect(submittedData.name).toBe("My Brand New Instance");
    expect(submittedData.slug).toBe("my-brand-new-instance");

    act(() => root.unmount());
  });
});
