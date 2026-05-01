# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2026-05-01

### Added

- `pnpm token-stats` script + CI regression guard with `TOKEN_BUDGET=28000`.

## [1.6.0] - 2026-05-01

### Added

- **`get-table-summary` aggregation tool** — table + lineage(depth 2) + (opt) sample data + (opt) DQ test cases in a single call. Replaces 3-4 round-trips. Uses `Promise.allSettled` for partial-failure tolerance.

## [1.5.0] - 2026-05-01

### Added

- **MCP Resources (`om://` URI scheme)** — 4 resource templates: `om://table/{fqn}`, `om://glossary-term/{fqn}`, `om://lineage/{type}/{fqn}`, `om://search/{query}`. Application-driven context inclusion (no tool schema token cost until read).

## [1.4.0] - 2026-05-01

### Added

- **`extractFields` auto-apply** via `wrapToolHandler` — params.extractFields detected automatically, no handler changes needed.
- `extractFields` schema field on 24 read tools across 7 entity modules (dashboards, pipelines, charts, mlmodels, topics, containers, glossary, glossary-terms). Total 28 read tools now declare it.

## [1.3.0] - 2026-05-01

### Added

- **Token efficiency standard** (cross-repo with datadog-mcp v1.9.0, google-drive-mcp v1.5.0):
  - `OM_TOOLS` / `OM_DISABLE` env vars: 9 categories (search, core, discovery, governance, quality, services, admin, events, meta).
  - `search-tools` meta-tool (always enabled): natural-language tool discovery.
  - `extractFields` parameter on `search-metadata`, `list-tables`, `get-table`, `get-table-by-name`.
- `tests/extract-fields.test.ts` (9 cases), `tests/tool-registry.test.ts` (7 cases).
- Vitest configuration.

### Changed

- Total tools: 154 → 155 (+search-tools meta-tool).
- `src/index.ts` refactored: `server.tool()` → `tool()` helper with category filtering.

## [1.2.1] - 2026-05-01

### Security

- Pin transitive `hono >=4.12.14` via `pnpm.overrides` to address [GHSA-458j-xx4x-4375](https://github.com/advisories/GHSA-458j-xx4x-4375) (medium, hono/jsx attribute key HTML injection). Not exploitable via this MCP (stdio transport, no JSX SSR), but applied for hygiene.

## [1.2.0] - 2026-05-01

### Added

- **`semantic-search` tool** wrapping OM 1.12+ `/search/vector/query` (vector-based natural-language search).
- README pivot: "When to use this vs OpenMetadata embedded MCP" comparison table for OM 1.12+.

### Changed

- Total tools: 153 → 154.

## [1.1.0] - 2026-04-20

### Added

- 6 sample-data reading tools for Tables, Topics, Containers (`get-*-sample-data` and `get-*-sample-data-by-name`).
- Default `OPENMETADATA_HOST` example in README.

## [1.0.3] - 2026-04-16

### Added

- npm package `repository` field for trusted publishing provenance.

## [1.0.0] - 2026-04-15

### Added

- Initial release with **143 tools** covering OpenMetadata API surface: tables, databases, schemas, lineage, services, glossaries, dashboards, pipelines, topics, charts, ML models, containers, classifications, tags, domains, data products, users, teams, access (roles, policies), data quality (test suites/cases), stored procedures, queries, events, bots.
- Read-only by default; write operations gated by `OPENMETADATA_ALLOW_WRITE=true`.
- Sensitive token redaction in error messages.
- JSON Patch updates via `application/json-patch+json` content type.
