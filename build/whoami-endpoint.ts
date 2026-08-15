import type { AddressInfo } from "node:net";
import type { Plugin } from "vite";

/** Identify the local development server without exposing this route in builds. */
export function whoamiEndpoint(version: string): Plugin {
  const startedAt = new Date().toISOString();
  return {
    name: "decimen-whoami-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/whoami", (req, res, next) => {
        if (req.method !== "GET") return next();
        const address = server.httpServer?.address() as AddressInfo | null;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.end(
          JSON.stringify({
            service: "decimen-optical-transfer",
            version,
            pid: process.pid,
            startedAt,
            host: address?.address ?? String(server.config.server.host ?? "0.0.0.0"),
            port: address?.port ?? server.config.server.port ?? null,
          }),
        );
      });
    },
  };
}
