import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPDFTemplate } from "./loadPDFTemplate.js";

test("a 200 HTML fallback is not passed to the PDF parser", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(calls.length === 1 ? "<!doctype html><html></html>" : "%PDF-1.7\nfixture");
  };
  try {
    const bytes = await loadPDFTemplate("ใบลา.pdf", "http://localhost:5000");
    assert.match(new TextDecoder().decode(bytes), /^%PDF-/);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[1].url, "http://localhost:5000/api/forms/preview/" + encodeURIComponent("ใบลา.pdf"));
  } finally { globalThis.fetch = original; }
});

test("missing or non-PDF responses produce an actionable error", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("not a PDF", { status: 404 });
  try {
    await assert.rejects(loadPDFTemplate("missing.pdf", "http://localhost:5000"), /ไม่สามารถโหลดแบบฟอร์ม PDF/);
  } finally { globalThis.fetch = original; }
});
