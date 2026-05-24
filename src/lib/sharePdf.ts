export type SharePdfResult = "shared" | "downloaded";

interface SharePdfOptions {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadPdfBlob({
  blob,
  fileName,
  title,
  text,
}: SharePdfOptions): Promise<SharePdfResult> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  const shareData: ShareData = { files: [file], title, text };
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
    await nav.share(shareData);
    return "shared";
  }

  downloadBlob(blob, fileName);
  return "downloaded";
}
