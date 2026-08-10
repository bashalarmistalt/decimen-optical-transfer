import type { Plugin } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dev-server sink for the receiver's end-of-run report (npm run diagnostics).
 *
 * The receiver POSTs one JSON object per completed transfer to /__diagnostics;
 * this middleware pretty-prints it into the terminal running the dev server,
 * which makes A/B runs comparable without squinting at the phone. Every
 * report is also stamped (`_meta`: app version + receipt time) and saved to
 * the gitignored scratch/diagnostics-runs/ — record runs get promoted from
 * there into benchmarks/ (see build/benchmarks.ts).
 *
 * `apply: "serve"` keeps the plugin out of every build pipeline, and the
 * client side of this contract (see finish() in receive/main.ts) is guarded by
 * `import.meta.env.DEV`, which is statically false in builds — so neither half
 * can leak into the static site, the GitHub Pages deploy, or the standalone
 * files.
 */
/** Pretty JSON, except the timeline renders one sample per line — the default
 *  two-space indent would put every number on its own line, turning a
 *  hundred samples into eight hundred rows of terminal. */
function formatReport(report: Record<string, unknown>): string {
  const { timeline, ...rest } = report;
  let text = JSON.stringify(rest, null, 2);
  if (Array.isArray(timeline)) {
    const rows = timeline.map((row) => `    ${JSON.stringify(row)}`).join(",\n");
    text = text.replace(/\n\}$/, `,\n  "timeline": [\n${rows}\n  ]\n}`);
  }
  return text;
}

export function diagnosticsEndpoint(version: string): Plugin {
  const runsDir = resolve(fileURLToPath(new URL("../scratch/diagnostics-runs", import.meta.url)));
  return {
    name: "diagnostics-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__diagnostics", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          try {
            const report = JSON.parse(body) as Record<string, unknown>;
            // report.role becomes part of a file path below. The dev server binds
            // to the LAN (server: { host: true }, so a phone can reach it), so
            // this body is attacker-reachable from anyone on the same network —
            // without sanitizing, a role like "../../../../home/x/.ssh/foo" is a
            // path-traversal write outside runsDir.
            const rawRole = typeof report.role === "string" ? report.role : "run";
            const role = /^[a-zA-Z0-9_-]+$/.test(rawRole) ? rawRole : "run";
            const receivedAt = new Date().toISOString();
            report._meta = { appVersion: version, receivedAt };
            server.config.logger.info(`\n[diagnostics] ${role} report\n${formatReport(report)}`);
            mkdirSync(runsDir, { recursive: true });
            const file = resolve(runsDir, `${receivedAt.replace(/[:.]/g, "-")}-${role}.json`);
            writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
            server.config.logger.info(`[diagnostics] saved ${file}`);
          } catch {
            server.config.logger.warn(`[diagnostics] unparseable report: ${body.slice(0, 200)}`);
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}
