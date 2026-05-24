import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  it("does not register outside production builds", () => {
    const serviceWorker = {
      register: vi.fn(),
    } as unknown as ServiceWorkerContainer;

    expect(registerServiceWorker({ isProd: false, serviceWorker })).toBe(false);
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it("registers on load in production builds", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi
      .spyOn(window, "addEventListener")
      .mockImplementation((event, listener) => {
        if (event === "load") {
          (listener as EventListener)(new Event("load"));
        }
      });

    expect(
      registerServiceWorker({
        isProd: true,
        serviceWorker: { register } as unknown as ServiceWorkerContainer,
      }),
    ).toBe(true);
    expect(register).toHaveBeenCalledWith("/sw.js");

    addEventListener.mockRestore();
  });
});
