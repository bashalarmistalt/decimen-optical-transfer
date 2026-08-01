import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer";

const BASE = "/fork-e2e";
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".wasm": "application/wasm", ".png": "image/png", ".mp4": "video/mp4", ".wav": "audio/wav",
};

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE + "/")) { res.writeHead(404).end(); return; }
  p = p.slice(BASE.length + 1) || "index.html";
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(join("dist", p));
    res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("nf: " + p);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const failures = [];
const ok = (cond, label) => { console.log((cond ? "PASS" : "FAIL") + " · " + label); if (!cond) failures.push(label); };

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const pageErrors = [];
const bad = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) bad.push(r.status() + " " + r.url()); });

await page.goto(`${origin}${BASE}/`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => location.pathname.includes("/send/"), { timeout: 8000 });
ok(true, "root redirects to /send/");
await page.waitForSelector("#cfg-payload option", { timeout: 8000 });

const state = await page.evaluate(() => {
  const q = (id) => document.getElementById(id);
  const vis = (el) => !!el && !el.hidden && el.offsetParent !== null;
  return {
    srcSegVisible: vis(q("src-seg")),
    fileVisible: vis(q("field-file")),
    payloadVisible: vis(q("field-payload")),
    options: [...document.querySelectorAll("#cfg-payload option")].map((o) => o.value),
    galleryLinksVisible: [...document.querySelectorAll('a[href*="gallery/"]')].filter((a) => !a.hidden).length,
    logoHref: q("rail-logo")?.getAttribute("href"),
  };
});
ok(!state.srcSegVisible, "source toggle hidden");
ok(!state.fileVisible, "My file input hidden");
ok(state.payloadVisible, "demo payload select visible");
ok(state.options.length === 3 && state.options.every((v) => v.includes("../demo/")), "exactly the 3 demo options: " + state.options.join(", "));
ok(state.galleryLinksVisible === 0, "no gallery links visible");
ok(!state.logoHref, "rail logo is not a link");

for (const v of state.options.slice().reverse()) {
  await page.select("#cfg-payload", v);
}
const selected = await page.$eval("#cfg-payload", (s) => s.value);
ok(selected === state.options[0], "all three options selectable (ends on " + selected + ")");

await page.click("#confirm-btn");
await page.waitForFunction(
  () => {
    const c = document.getElementById("qr");
    return c && c.width > 64 && !document.getElementById("stage-actions").hidden;
  },
  { timeout: 15000 },
);
ok(true, "confirm starts streaming (QR canvas live, Done visible)");
const demoFetched = await page.evaluate(async () => (await fetch("../demo/demo-image.png")).ok);
ok(demoFetched, "demo asset fetch resolves under the fork base");

await page.click("#done-btn");
await page.waitForFunction(() => document.getElementById("confirm-btn") && !document.getElementById("confirm-btn").disabled, { timeout: 8000 });
ok(page.url().includes("/send/"), "Done stays on the send page (no gallery 404): " + page.url());

ok(pageErrors.length === 0, "no page errors" + (pageErrors.length ? " · " + pageErrors.join(" | ") : ""));
ok(bad.length === 0, "no failed requests" + (bad.length ? " · " + bad.join(" | ") : ""));

await browser.close();
server.close();
console.log(failures.length ? "E2E RESULT: FAIL (" + failures.length + ")" : "E2E RESULT: ALL PASS");
process.exit(failures.length ? 1 : 0);
