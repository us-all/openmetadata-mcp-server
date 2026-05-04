# OpenMetadata MCP Server

> **The OpenMetadata MCP that ships full CRUD across every entity type — including OM 1.12+ Data Contracts, Metrics, Search Index, API Collections, and API Endpoints that the embedded MCP doesn't cover yet.**
>
> 156 tools, 4 workflow Prompts (lineage impact / DQ investigation / glossary bootstrap / owner reassign), 7 MCP Resources, and the `get-domain-summary` aggregation that pulls a domain + its 6 child entity types in one call.

[![npm](https://img.shields.io/npm/v/@us-all/openmetadata-mcp)](https://www.npmjs.com/package/@us-all/openmetadata-mcp)
[![downloads](https://img.shields.io/npm/dm/@us-all/openmetadata-mcp)](https://www.npmjs.com/package/@us-all/openmetadata-mcp)
[![tools](https://img.shields.io/badge/tools-156-blue)](#tools)
[![@us-all standard](https://img.shields.io/badge/built%20to-%40us--all%20MCP%20standard-blue)](https://github.com/us-all/mcp-toolkit/blob/main/STANDARD.md)

## What it does that others don't

- **OM 1.12+ entity coverage** — Data Contracts, Metrics, Search Index, API Collections, API Endpoints (10 read tools). Not in the embedded MCP yet.
- **Aggregation tools** — `get-domain-summary` returns domain + 6 child entity types (`tables`, `dashboards`, `pipelines`, `mlmodels`, `topics`, `dataProducts`) via `/search/query` with `track_total_hits` in **one call** instead of 7 sequential. `get-table-summary` folds table + lineage + sample-data + DQ similarly.
- **Semantic search** — `semantic-search` over OM 1.12+ vector index (POST `/search/vector/query`). Useful when keyword search misses synonyms.
- **MCP Prompts** (4) — `lineage-impact-analysis`, `data-quality-investigation`, `glossary-term-bootstrap`, `owner-change-propagation`. Workflow templates the model invokes directly.
- **MCP Resources** (7) — `om://table/{fqn}`, `om://glossary-term/{fqn}`, `om://lineage/{type}/{fqn}`, `om://search/{query}`, `om://dashboard/{fqn}`, `om://pipeline/{fqn}`, `om://schema/{fqn}`.
- **Token-efficient by design** — `extractFields` projection on 28 read tools (drops `changeDescription`/`version`/`updatedBy`/`href` noise — ~80% size reduction), `OM_TOOLS`/`OM_DISABLE` 9 categories, `search-tools` meta-tool.

## Try this — 5 prompts

Connect the server to Claude Desktop or Claude Code, then paste any of these:

1. **Lineage impact** — *"The `payments.transactions` table is being deprecated. List every dashboard, pipeline, and ML model that depends on it (upstream + downstream, depth 3)."*
2. **Data quality investigation** — *"Show all failing test cases from the last 7 days. Group by table, then by test type, with pass/fail counts."*
3. **Glossary bootstrap** — *"Create a `payments` glossary with these 8 terms: chargeback, refund, settlement, KYC, AML, transaction, customer-id, payment-method. Link related terms."*
4. **Owner reassign** — *"User `taehee` is leaving. List every entity (table/dashboard/pipeline/ML model) where they are owner. Then reassign all of them to team `data-platform`."*
5. **Domain summary** — *"Summarize the `analytics` domain: total tables/dashboards/pipelines/ML models, top 5 by recent updates, and the data products it owns."*

## When to use this vs OpenMetadata's embedded MCP

OpenMetadata 1.12+ ships an embedded MCP. They are **complementary**:

| | OM 1.12 embedded MCP | `@us-all/openmetadata-mcp` (this) |
|--|----------------------|-----------------------------------|
| Tool count | ~10 (search, glossary basics, lineage, DQ, RCA, semantic search) | **156** (full CRUD across all entity types) |
| OM 1.12+ entity types (Data Contracts/Metrics/Search Index/API) | partial | ✅ 10 read tools |
| Aggregation tools | ❌ | ✅ `get-domain-summary`, `get-table-summary` |
| MCP Prompts | ❌ | ✅ 4 |
| MCP Resources | ❌ | ✅ 7 |
| Auth | OAuth2 / PAT, OM Authorization Engine (RBAC) | JWT bot token + write gate |
| Deployment | Embedded in OM server (marketplace install) | Standalone npm / Docker / npx |
| OM version | 1.12+ only | 1.x compatible |
| Best for | RBAC-aware AI agents, SSO orgs | Bulk CRUD, automation, sample-data, older OM clusters |

Use the embedded MCP for RBAC-aware governance with SSO. Use this server for bulk metadata operations, full entity CRUD parity, automation, and OM clusters older than 1.12.

## Install

### Claude Desktop

```json
{
  "mcpServers": {
    "openmetadata": {
      "command": "npx",
      "args": ["-y", "@us-all/openmetadata-mcp"],
      "env": {
        "OPENMETADATA_HOST": "http://your-host:8585",
        "OPENMETADATA_TOKEN": "<jwt-bot-token>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add openmetadata -s user \
  -e OPENMETADATA_HOST=http://your-host:8585 \
  -e OPENMETADATA_TOKEN=<jwt-bot-token> \
  -- npx -y @us-all/openmetadata-mcp
```

### Docker

```bash
docker run --rm -i \
  -e OPENMETADATA_HOST=http://your-host:8585 \
  -e OPENMETADATA_TOKEN=<jwt-bot-token> \
  ghcr.io/us-all/openmetadata-mcp-server
```

### Build from source

```bash
git clone https://github.com/us-all/openmetadata-mcp-server.git
cd openmetadata-mcp-server && pnpm install && pnpm build
node dist/index.js
```

### Get a token

1. Open OpenMetadata UI → **Settings → Bots**
2. Create a new bot or use an existing one (`ingestion-bot` works)
3. Copy the JWT token

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENMETADATA_HOST` | ✅ | — | OpenMetadata server URL (e.g. `http://localhost:8585`) |
| `OPENMETADATA_TOKEN` | ✅ | — | JWT or Bot token |
| `OPENMETADATA_ALLOW_WRITE` | ❌ | `false` | Set `true` to enable mutations (create/update/delete) |
| `OM_TOOLS` | ❌ | — | Comma-sep allowlist of categories. Biggest token saver. |
| `OM_DISABLE` | ❌ | — | Comma-sep denylist. Ignored when `OM_TOOLS` is set. |

**Categories** (9): `search`, `core`, `discovery`, `governance`, `quality`, `services`, `admin`, `events`, `meta` (always-on).

### Token efficiency

| Scenario | Tools | Schema tokens | vs default |
|----------|------:|--------------:|-----------:|
| default (all categories) | 156 | 24,000 | — |
| typical (`OM_TOOLS=search,core,governance,quality,discovery`) | 120 | 19,500 | −19% |
| narrow (`OM_TOOLS=search,core`) | 26 | **4,600** | **−81%** |

`extractFields` adds another ~80–90% reduction on individual responses (e.g. `get-table` 8KB → 200B with `extractFields: "name,columns.*.name,columns.*.dataType"`). Auto-applied across 28 read tools.

```jsonc
// without
get-table { "id": "..." }

// with
get-table { "id": "...", "extractFields": "name,description,columns.*.name,columns.*.dataType" }
```

## MCP Prompts (4)

Workflow templates available via MCP `prompts/list`:

- `lineage-impact-analysis` — given an entity, walk upstream + downstream lineage and rank by impact.
- `data-quality-investigation` — diff DQ test results across two windows; cluster failure modes.
- `glossary-term-bootstrap` — bulk-create a glossary with N related terms, link automatically.
- `owner-change-propagation` — find all entities owned by user X, propose batch reassignment.

## MCP Resources

URI-based read-only access:

`om://table/{fqn}` (table + columns + owners + tags + joins), `om://glossary-term/{fqn}`, `om://lineage/{type}/{fqn}` (depth 3), `om://search/{query}` (top 10 keyword hits), `om://dashboard/{fqn}`, `om://pipeline/{fqn}` (with tasks), `om://schema/{fqn}`.

## Tools (156)

9 categories. Use `search-tools` to discover at runtime; full list collapsed below.

| Category | Tools |
|----------|------:|
| Tables / Databases / Schemas / Lineage | 22 |
| Services (database/dashboard/messaging/pipeline/ml/storage) | 16 |
| Glossaries / Terms | 12 |
| Domains / Data Products | 12 |
| Classifications / Tags | 10 |
| Discovery (dashboards / pipelines / charts / topics / containers / ml-models) | 36 |
| Governance (roles / policies / users / teams / bots) | 13 |
| Quality (test suites / cases / sample data) | 13 |
| Stored Procedures / Queries | 11 |
| OM 1.12+ entities (Data Contract / Metric / Search Index / API Collection / API Endpoint) | 10 |
| Search (`search-metadata`, `suggest-metadata`, `semantic-search`) | 3 |
| Aggregations (`get-domain-summary`, `get-table-summary`) | 2 |
| Meta (`search-tools`) | 1 |

<details>
<summary>Full tool list</summary>

### Search (3)
`search-metadata`, `suggest-metadata`, `semantic-search`

### Tables (6)
`list-tables`, `get-table`, `get-table-by-name`, `create-table`, `update-table`, `delete-table`

### Databases (6)
`list-databases`, `get-database`, `get-database-by-name`, `create-database`, `update-database`, `delete-database`

### Database Schemas (6)
`list-schemas`, `get-schema`, `get-schema-by-name`, `create-schema`, `update-schema`, `delete-schema`

### Lineage (4)
`get-lineage`, `get-lineage-by-name`, `add-lineage`, `delete-lineage`

### Services (16)
6 database-service tools + 2 each for dashboard/messaging/pipeline/ml-model/storage services.

### Glossaries (12)
6 glossary CRUD + 6 glossary-term CRUD.

### Dashboards / Pipelines / Topics / Charts / Containers / ML Models (36)
6 CRUD each, follows `list / get / get-by-name / create / update / delete`.

### Classifications & Tags (10)
4 classification + 6 tag CRUD.

### Domains & Data Products (12)
6 domain + 6 data-product CRUD.

### Users & Teams (9)
3 user reads + 6 team CRUD.

### Access Control (4)
`list-roles`, `get-role`, `list-policies`, `get-policy`

### Data Quality (7)
`list-test-suites`, `get-test-suite`, `get-test-suite-by-name`, `list-test-cases`, `get-test-case`, `get-test-case-by-name`, `list-test-case-results`

### Stored Procedures (6)
6 CRUD.

### Queries (5)
`list-queries`, `get-query`, `create-query`, `update-query`, `delete-query`

### Events (3)
`list-events`, `get-event-subscription`, `get-event-subscription-by-name`

### Bots (3)
`list-bots`, `get-bot`, `get-bot-by-name`

### Sample Data (6, read-only)
`get-table-sample-data`, `get-table-sample-data-by-name`, `get-topic-sample-data`, `get-topic-sample-data-by-name`, `get-container-sample-data`, `get-container-sample-data-by-name`

### OM 1.12+ entities (10)
`list-data-contracts`, `get-data-contract-by-name`, `list-metrics`, `get-metric-by-name`, `list-search-indexes`, `get-search-index-by-name`, `list-api-collections`, `get-api-collection-by-name`, `list-api-endpoints`, `get-api-endpoint-by-name`

### Aggregations
`get-domain-summary`, `get-table-summary`

### Meta
`search-tools` — query other tools by keyword; always enabled.

</details>

## Architecture

```
Claude → MCP stdio → src/index.ts → src/tools/*.ts → OpenMetadataClient (fetch) → OpenMetadata REST
```

Built on [`@us-all/mcp-toolkit`](https://github.com/us-all/mcp-toolkit):
- `extractFields` — token-efficient response projections
- `aggregate(fetchers, caveats)` — fan-out helper for `get-domain-summary` / `get-table-summary`
- `createWrapToolHandler` — `OPENMETADATA_TOKEN` redaction + `OpenMetadataError` extraction
- `search-tools` meta-tool

Targets OM 1.x. Validated against real OM backend with the OM 1.12+ entities.

## Tech stack

Node.js 18+ • TypeScript strict ESM • pnpm • `@modelcontextprotocol/sdk` • zod • dotenv • vitest.

JSON-Patch updates handled automatically (PATCH `application/json-patch+json` content-type).

## License

[MIT](./LICENSE)
