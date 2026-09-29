import { defineConfig, loadEnv } from "vite";
import type { Connect, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { apiBase, createClashHandler } from "./api/_lib/clash.js";
import type { ApiHandler } from "./api/_lib/clash.js";
import {
  createHistoryHandler,
  createSyncHandler,
} from "./api/_lib/history.js";

/**
 * Serves the /api routes from the Vite dev/preview server with the same
 * handlers as the Vercel functions, so `npm run dev` works without a separate
 * API server. Without this, Vite answers /api/clash with the source of
 * api/clash.js.
 */
function apiRoutes(env: Record<string, string>): Plugin {
  const mount = (middlewares: Connect.Server) => {
    // The handlers read CLASH_KEY, DATABASE_URL etc. from process.env.
    for (const [name, value] of Object.entries(env)) {
      process.env[name] ??= value;
    }
    const base = apiBase();
    const routes: Record<string, ApiHandler> = {
      "/api/clash": createClashHandler(base),
      "/api/history": createHistoryHandler(base),
      "/api/sync": createSyncHandler(base),
    };

    for (const [path, handler] of Object.entries(routes)) {
      middlewares.use(path, (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        // Adapt Node's response to the Vercel/Express-style API the handlers use.
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
        const query = Object.fromEntries(url.searchParams);
        void handler({ query, headers: req.headers }, vres);
      });
    }
  };

  return {
    name: "api-routes",
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig(({ mode }) => ({
  base: "/",
  // '' loads every variable from .env, not just VITE_ ones, so CLASH_KEY and
  // DATABASE_URL are available here. They're only used server-side and never
  // reach the bundle.
  plugins: [react(), apiRoutes(loadEnv(mode, process.cwd(), ""))],
}));
