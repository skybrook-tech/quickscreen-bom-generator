import { afterEach, describe, expect, it, vi } from "vitest";
import { shareOrDownloadPdfBlob } from "./sharePdf";

describe("shareOrDownloadPdfBlob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("uses the native share sheet when file sharing is supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });

    const result = await shareOrDownloadPdfBlob({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "quote.pdf",
      title: "QuickScreen Quote",
      text: "Quote PDF",
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "QuickScreen Quote",
        text: "Quote PDF",
        files: [expect.any(File)],
      }),
    );
  });

  it("downloads the PDF when native file sharing is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:quote");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        tagName,
      ) as HTMLElement;
      if (tagName === "a") {
        Object.defineProperty(element, "click", {
          value: click,
          configurable: true,
        });
      }
      return element as never;
    });

    const result = await shareOrDownloadPdfBlob({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "quote.pdf",
      title: "QuickScreen Quote",
      text: "Quote PDF",
    });

    expect(result).toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:quote");
  });
});
