export async function loadPDFTemplate(fileName, apiUrl) {
  const encodedName = encodeURIComponent(fileName);
  const urls = [`/forms/${encodedName}`, `${apiUrl}/api/forms/preview/${encodedName}`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      // SPA servers may return index.html with HTTP 200 for a missing asset.
      const header = new TextDecoder().decode(bytes.slice(0, 1024));
      if (header.includes("%PDF-")) return bytes;
    } catch {
      // Try the server's existing form endpoint when the static asset is unavailable.
    }
  }
  throw new Error(`ไม่สามารถโหลดแบบฟอร์ม PDF: ${fileName} กรุณาลองอีกครั้ง`);
}
