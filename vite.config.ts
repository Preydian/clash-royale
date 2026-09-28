import { defineConfig, loadEnv } from "vite";
import type { Connect, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createClashHandler } from "./api/_lib/clash.js";

/**
 * Serves /api/clash from the Vite dev/preview server with the same handler as
 * the Vercel function, so `npm run dev` works without a separate API server.
 * Without this, Vite answers /api/clash with the source of api/clash.js.
 */
function clashApi(env: Record<string, string>): Plugin {
  const mount = (middlewares: Connect.Server) => {
    if (env.CLASH_KEY) process.env.CLASH_KEY ??= env.CLASH_KEY;
    const handler = createClashHandler(
      env.CLASH_API_BASE || "https://proxy.royaleapi.dev/v1",
    );

    middlewares.use("/api/clash", (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      // Adapt Node's response to the Vercel/Express-style API the handler uses.
      const vres = {
        status(code: number) {
          res.statusCode = code;
          return vres;
        },
        setHeader(name: string, value: string) {
          res.setHeader(name, value);
        },
        json(body: unknown) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        },
        send(body: string) {
          res.end(body);
        },
      };
      void handler({ query: Object.fromEntries(url.searchParams) }, vres);
    });
  };

  return {
    name: "clash-api",
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig(({ mode }) => ({
  base: "/",
  // '' loads every variable from .env, not just VITE_ ones, so CLASH_KEY is
  // available here. It is only used server-side and never reaches the bundle.
  plugins: [react(), clashApi(loadEnv(mode, process.cwd(), ""))],
}));
