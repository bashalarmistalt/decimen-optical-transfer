import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const tauriDev = !!process.env.TAURI_DEV || !!process.env.TAURI_ENV_PLATFORM;
const pagesDemo = !!process.env.PAGES_DEMO;
import { resolve } from "node:path";
import { existsSync, rmSync, writeFileSync } from "node:fs";

function pagesDemoFinalize() {
  return {
    name: "pages-demo-finalize",
    closeBundle() {
      for (const p of ["dist/receive", "dist/gallery", "dist/success.png", "dist/success-2mb.png"]) {
        rmSync(p, { recursive: true, force: true });
      }
      for (const p of ["dist/demo/demo-image.png", "dist/demo/demo-video.mp4", "dist/demo/demo-audio.wav"]) {
        if (!existsSync(p)) throw new Error(`pages demo build: ${p} missing from dist`);
      }
      writeFileSync(
        "dist/index.html",
        [
          "<!doctype html>",
          '<html lang="en"><head><meta charset="UTF-8" />',
          '<meta http-equiv="refresh" content="0; url=./send/" />',
          "<title>Airgap Optical Transfer · demo</title></head>",
          '<body><p>Opening the sender demo: <a href="./send/">send page</a></p></body></html>',
          "",
        ].join("\n"),
      );
      console.log("pages-demo-finalize: send-only demo ready (redirect written, receive/gallery & bulk payloads pruned, 3 demo assets verified)");
    },
  };
}

// HTTPS always: the receiver needs getUserMedia, and on insecure origins
// that API does not exist at all — a phone reaching this server over the LAN
// gets no camera on plain http (browser rule, localhost-only exemption).
// The generated cert is self-signed: tap through the warning once on the
// phone and the page is still a secure context, so the camera works.
export default defineConfig({
  base: pagesDemo ? process.env.PAGES_BASE || "/decimen-optical-transfer/" : "./",
  define: { __PAGES_DEMO__: JSON.stringify(pagesDemo) },
  plugins: [...(tauriDev ? [] : [basicSsl()]), ...(pagesDemo ? [pagesDemoFinalize()] : [])],
  build: {
    rollupOptions: {
      input: pagesDemo
        ? { send: resolve(__dirname, "send/index.html") }
        : {
            index: resolve(__dirname, "index.html"),
            send: resolve(__dirname, "send/index.html"),
            receive: resolve(__dirname, "receive/index.html"),
            gallery: resolve(__dirname, "gallery/index.html"),
          },
    },
  },
  server: { host: true },
});
