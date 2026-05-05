/**
 * Smoke test for OpenMetadata MCP Server.
 *
 * Spawns the server as a child process, sends JSON-RPC 2.0 over stdin,
 * reads responses from stdout, and verifies:
 *
 *   1. Protocol-level: initialize, tools/list count, ui:// resource for
 *      the lineage-impact card. Runs without live OpenMetadata creds.
 *   2. API-level: search-metadata, list-tables, get-table-by-name,
 *      lineage-impact. Skipped gracefully when creds are unset/invalid
 *      so the protocol checks above still pass in CI.
 *
 * Requires `OPENMETADATA_HOST` + `OPENMETADATA_TOKEN` for the live tests.
 * Set `OM_SMOKE_TABLE_FQN` to a known table FQN to exercise lineage-impact
 * (skipped otherwise — synthetic FQN would just 404).
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   pnpm run smoke          # builds first via presmoke
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const SERVER_BIN = resolve(PROJECT_ROOT, "dist/index.js");

const TIMEOUT_MS = 30_000;
const EXPECTED_TOOL_COUNT = 168;
const EXPECTED_UI_RESOURCE = "ui://widget/lineage-impact.html";

// ── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;

function makeRequest(method, params = {}) {
  return { jsonrpc: "2.0", id: nextId++, method, params };
}

function truncate(str, maxLen = 80) {
  if (typeof str !== "string") str = JSON.stringify(str);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function startServer() {
  // Ensure the server boots even when the user hasn't set creds — we still
  // want the protocol-level checks to run. The tools that hit the API will
  // simply return errors, which downstream tests skip.
  const env = {
    ...process.env,
    OPENMETADATA_HOST: process.env.OPENMETADATA_HOST ?? "http://localhost:8585",
    OPENMETADATA_TOKEN: process.env.OPENMETADATA_TOKEN ?? "smoke-test-placeholder",
  };

  const child = spawn("node", [SERVER_BIN], {
    cwd: PROJECT_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  let buffer = "";
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("{")) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && pending.has(msg.id)) {
          const { resolve } = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg);
        }
      } catch {
        // ignore stray non-JSON
      }
    }
  });

  child.stderr.on("data", () => {
    // swallow startup logs
  });

  function send(method, params = {}) {
    return new Promise((resolveReq, rejectReq) => {
      const req = makeRequest(method, params);
      pending.set(req.id, { resolve: resolveReq, reject: rejectReq });
      child.stdin.write(JSON.stringify(req) + "\n");
      setTimeout(() => {
        if (pending.has(req.id)) {
          pending.delete(req.id);
          rejectReq(new Error(`timeout: ${method}`));
        }
      }, TIMEOUT_MS);
    });
  }

  function kill() {
    child.stdin.end();
    child.kill("SIGTERM");
  }

  return { send, kill, child };
}

// Detects upstream-API failures (no live OM available). Used to mark API
// tests as "skipped" rather than "failed" when creds aren't real.
function isUpstreamUnreachable(text) {
  return /ECONNREFUSED|ENOTFOUND|fetch failed|Unauthorized|Forbidden|401|403|connect/i.test(text);
}

// ── Test definitions ─────────────────────────────────────────────────────────

const tests = [
  {
    name: "initialize",
    run: async (send) => {
      const res = await send("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "1.0.0" },
      });
      if (res.error) throw new Error(res.error.message);
      const info = res.result?.serverInfo;
      if (!info?.name) throw new Error("Missing serverInfo.name");
      return `server: ${info.name} v${info.version}`;
    },
  },
  {
    name: "tools/list",
    run: async (send) => {
      const res = await send("tools/list", {});
      if (res.error) throw new Error(res.error.message);
      const count = res.result?.tools?.length ?? 0;
      if (count !== EXPECTED_TOOL_COUNT) {
        throw new Error(`Expected ${EXPECTED_TOOL_COUNT} tools, got ${count}`);
      }
      const lineageImpact = res.result.tools.find((t) => t.name === "lineage-impact");
      if (!lineageImpact) throw new Error("lineage-impact tool not registered");
      return `${count} tools (incl. lineage-impact)`;
    },
  },
  {
    name: "resources/list — ui:// card",
    run: async (send) => {
      const res = await send("resources/list", {});
      if (res.error) throw new Error(res.error.message);
      const card = (res.result?.resources ?? []).find((r) => r.uri === EXPECTED_UI_RESOURCE);
      if (!card) throw new Error(`${EXPECTED_UI_RESOURCE} not registered`);
      if (card.mimeType !== "text/html+skybridge") {
        throw new Error(`unexpected mimeType: ${card.mimeType}`);
      }
      const tpl = card._meta?.["openai/outputTemplate"];
      if (tpl !== EXPECTED_UI_RESOURCE) {
        throw new Error(`_meta openai/outputTemplate mismatch: ${tpl}`);
      }
      return `mimeType=${card.mimeType} _meta=ok`;
    },
  },
  {
    name: "resources/read — card HTML",
    run: async (send) => {
      const res = await send("resources/read", { uri: EXPECTED_UI_RESOURCE });
      if (res.error) throw new Error(res.error.message);
      const c = res.result?.contents?.[0];
      if (!c?.text || c.text.length < 200) throw new Error("HTML body too short");
      if (!c.text.includes("window.openai")) throw new Error("missing window.openai hook");
      return `${c.text.length} bytes, mime=${c.mimeType}`;
    },
  },
  {
    name: "search-metadata",
    run: async (send) => {
      const res = await send("tools/call", {
        name: "search-metadata",
        arguments: { q: "*", from: 0, size: 1 },
      });
      if (res.error) throw new Error(res.error.message);
      const text = res.result?.content?.[0]?.text ?? "";
      if (res.result?.isError) {
        if (isUpstreamUnreachable(text)) return "skipped (no live OM)";
        throw new Error(truncate(text));
      }
      return truncate(text, 60);
    },
  },
  {
    name: "list-tables",
    run: async (send) => {
      const res = await send("tools/call", {
        name: "list-tables",
        arguments: { limit: 1 },
      });
      if (res.error) throw new Error(res.error.message);
      const text = res.result?.content?.[0]?.text ?? "";
      if (res.result?.isError) {
        if (isUpstreamUnreachable(text)) return "skipped (no live OM)";
        throw new Error(truncate(text));
      }
      return truncate(text, 60);
    },
  },
  {
    name: "lineage-impact",
    run: async (send) => {
      const fqn = process.env.OM_SMOKE_TABLE_FQN;
      if (!fqn) return "skipped (set OM_SMOKE_TABLE_FQN to exercise)";
      const res = await send("tools/call", {
        name: "lineage-impact",
        arguments: { entity: "table", fqn, downstreamDepth: 2, includeOwners: true },
      });
      if (res.error) throw new Error(res.error.message);
      const text = res.result?.content?.[0]?.text ?? "";
      if (res.result?.isError) {
        if (isUpstreamUnreachable(text)) return "skipped (no live OM)";
        throw new Error(truncate(text));
      }
      // Verify expected aggregation fields are present.
      const data = JSON.parse(text);
      if (!data.impact || typeof data.impact.downstreamCount !== "number") {
        throw new Error("missing impact.downstreamCount");
      }
      return `downstream=${data.impact.downstreamCount} owners=${data.impact.ownersAffected}`;
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Smoke test — OpenMetadata MCP Server\n");

  const { send, kill } = startServer();

  let pass = 0;
  let skip = 0;
  let fail = 0;

  for (const t of tests) {
    try {
      const result = await t.run(send);
      if (typeof result === "string" && result.startsWith("skipped")) {
        console.log(`  - ${t.name}: ${result}`);
        skip++;
      } else {
        console.log(`  ✓ ${t.name}: ${result}`);
        pass++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${t.name}: ${message}`);
      fail++;
    }
  }

  kill();

  console.log(`\n${pass} passed, ${skip} skipped, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
