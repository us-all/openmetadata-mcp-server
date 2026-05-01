# OpenMetadata MCP Server

MCP server for [OpenMetadata](https://open-metadata.org/) — **155 tools** covering metadata management, data lineage, search (incl. semantic), data quality, and more. Read-only by default.

**Token-efficient by design** — `extractFields` response projection, `OM_TOOLS`/`OM_DISABLE` category toggles, and a `search-tools` meta-tool let you keep LLM context costs low across the 155-tool surface.

## When to use this vs OpenMetadata's embedded MCP

OpenMetadata 1.12+ ships with an embedded MCP server. They are **complementary**:

| | OM 1.12 embedded MCP | `@us-all/openmetadata-mcp` (this) |
|--|----------------------|-----------------------------------|
| Tool count | ~10 (search, glossary basics, lineage, DQ, RCA, semantic search) | **154** (full CRUD across all entity types) |
| Auth | OAuth2 / PAT, inherits OM Authorization Engine (RBAC) | JWT bot token + `OPENMETADATA_ALLOW_WRITE` gate |
| Deployment | Embedded in OM server (marketplace install) | Standalone npm / Docker / npx |
| OM version | 1.12+ only | 1.x compatible |
| Best for | RBAC-aware AI agents, SSO orgs, governance flows | Bulk CRUD, automation, sample-data inspection, older OM clusters |

Use the embedded MCP when you need RBAC-aware governance with SSO. Use this server for bulk metadata operations, full entity CRUD parity, and OM clusters older than 1.12.

## Quick Start

```bash
# npx (no install)
npx @us-all/openmetadata-mcp

# or install globally
npm i -g @us-all/openmetadata-mcp
openmetadata-mcp
```

### Claude Code

```bash
claude mcp add openmetadata \
  -e OPENMETADATA_HOST=http://your-host:8585 \
  -e OPENMETADATA_TOKEN=your-jwt-token \
  -- npx @us-all/openmetadata-mcp
```

### Claude Desktop / Cursor

Add to your MCP settings JSON:

```json
{
  "mcpServers": {
    "openmetadata": {
      "command": "npx",
      "args": ["@us-all/openmetadata-mcp"],
      "env": {
        "OPENMETADATA_HOST": "http://your-host:8585",
        "OPENMETADATA_TOKEN": "your-jwt-token"
      }
    }
  }
}
```

### Docker

```bash
docker run --rm -i \
  -e OPENMETADATA_HOST=http://your-host:8585 \
  -e OPENMETADATA_TOKEN=your-jwt-token \
  ghcr.io/us-all/openmetadata-mcp-server
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENMETADATA_HOST` | Yes | OpenMetadata server URL (e.g. `http://localhost:8585`) |
| `OPENMETADATA_TOKEN` | Yes | JWT or Bot token for authentication |
| `OPENMETADATA_ALLOW_WRITE` | No | Set to `true` to enable create/update/delete operations (default: `false`) |
| `OM_TOOLS` | No | Comma-separated allowlist of tool categories to load (e.g. `core,governance,quality`). When set, **only** these load — biggest token saver. Categories: `search`, `core`, `discovery`, `governance`, `quality`, `services`, `admin`, `events`. |
| `OM_DISABLE` | No | Comma-separated denylist (e.g. `events,admin`). Ignored when `OM_TOOLS` is set. |

## Token Efficiency

With 155 tools, naive setup loads ~24K tokens of tool schema into LLM context before any conversation begins. Three patterns mitigate this.

**Measured impact** (from `tools/list` JSON length, ~4 chars/token):

| Scenario | Tools loaded | Schema tokens | vs default |
|----------|--------------|---------------|-----------|
| default (all categories) | 155 | **24,000** | — |
| typical (`OM_TOOLS=search,core,governance,quality,discovery`) | 120 | 19,500 | −19% |
| narrow (`OM_TOOLS=search,core`) | 26 | **4,600** | **−81%** |

`extractFields` response projection adds another ~90% reduction on individual tool responses (e.g. `get-table` 8KB → 200B with `extractFields: "name,columns.*.name,columns.*.dataType"`).

### 1. Category toggles (biggest win)

```bash
# Only data exploration tools
OM_TOOLS=search,core,discovery,quality

# Or exclude write/admin paths
OM_DISABLE=admin,events,services
```

Use `search-tools` (always enabled) to discover which tools exist regardless of what's loaded — call it first to find the right tool, then re-launch with broader categories if needed.

### 2. `extractFields` response projection

Available on 28 read tools (search, list/get for tables/dashboards/pipelines/charts/topics/mlmodels/containers/glossaries/glossary-terms). Comma-separated dotted paths with `*` wildcard:

```jsonc
// Without: 8KB JSON with 50+ fields per column
get-table { "id": "..." }

// With: ~200 bytes, just what you need
get-table { "id": "...", "extractFields": "name,description,columns.*.name,columns.*.dataType" }
```

### 3. `search-tools` meta-tool

Don't memorize 155 tool names. Discover by query:

```
search-tools { "query": "lineage" }
→ get-lineage, get-lineage-by-name, add-lineage, delete-lineage
```

## Tools (155)

### Meta (1)
`search-tools` — discover tools by natural-language query (always enabled)

### Search (3)
`search-metadata` `suggest-metadata` `semantic-search`

### Tables (6)
`list-tables` `get-table` `get-table-by-name` `create-table` `update-table` `delete-table`

### Databases (6)
`list-databases` `get-database` `get-database-by-name` `create-database` `update-database` `delete-database`

### Database Schemas (6)
`list-schemas` `get-schema` `get-schema-by-name` `create-schema` `update-schema` `delete-schema`

### Lineage (4)
`get-lineage` `get-lineage-by-name` `add-lineage` `delete-lineage`

### Services (16)
`list-database-services` `get-database-service` `get-database-service-by-name` `create-database-service` `update-database-service` `delete-database-service` `list-dashboard-services` `get-dashboard-service` `list-messaging-services` `get-messaging-service` `list-pipeline-services` `get-pipeline-service` `list-ml-model-services` `get-ml-model-service` `list-storage-services` `get-storage-service`

### Glossaries (12)
`list-glossaries` `get-glossary` `get-glossary-by-name` `create-glossary` `update-glossary` `delete-glossary` `list-glossary-terms` `get-glossary-term` `get-glossary-term-by-name` `create-glossary-term` `update-glossary-term` `delete-glossary-term`

### Dashboards (6)
`list-dashboards` `get-dashboard` `get-dashboard-by-name` `create-dashboard` `update-dashboard` `delete-dashboard`

### Pipelines (6)
`list-pipelines` `get-pipeline` `get-pipeline-by-name` `create-pipeline` `update-pipeline` `delete-pipeline`

### Topics (6)
`list-topics` `get-topic` `get-topic-by-name` `create-topic` `update-topic` `delete-topic`

### Charts (6)
`list-charts` `get-chart` `get-chart-by-name` `create-chart` `update-chart` `delete-chart`

### Containers (6)
`list-containers` `get-container` `get-container-by-name` `create-container` `update-container` `delete-container`

### ML Models (6)
`list-ml-models` `get-ml-model` `get-ml-model-by-name` `create-ml-model` `update-ml-model` `delete-ml-model`

### Classifications & Tags (10)
`list-classifications` `get-classification` `create-classification` `delete-classification` `list-tags` `get-tag` `get-tag-by-name` `create-tag` `update-tag` `delete-tag`

### Domains & Data Products (12)
`list-domains` `get-domain` `get-domain-by-name` `create-domain` `update-domain` `delete-domain` `list-data-products` `get-data-product` `get-data-product-by-name` `create-data-product` `update-data-product` `delete-data-product`

### Users & Teams (9)
`list-users` `get-user` `get-user-by-name` `list-teams` `get-team` `get-team-by-name` `create-team` `update-team` `delete-team`

### Access Control (4)
`list-roles` `get-role` `list-policies` `get-policy`

### Data Quality (7)
`list-test-suites` `get-test-suite` `get-test-suite-by-name` `list-test-cases` `get-test-case` `get-test-case-by-name` `list-test-case-results`

### Stored Procedures (6)
`list-stored-procedures` `get-stored-procedure` `get-stored-procedure-by-name` `create-stored-procedure` `update-stored-procedure` `delete-stored-procedure`

### Queries (5)
`list-queries` `get-query` `create-query` `update-query` `delete-query`

### Events (3)
`list-events` `get-event-subscription` `get-event-subscription-by-name`

### Bots (3)
`list-bots` `get-bot` `get-bot-by-name`

### Sample Data (6, read-only)
`get-table-sample-data` `get-table-sample-data-by-name` `get-topic-sample-data` `get-topic-sample-data-by-name` `get-container-sample-data` `get-container-sample-data-by-name`

## Getting a Token

1. Open your OpenMetadata UI
2. Go to **Settings > Bots**
3. Create a new bot or use an existing one (e.g. `ingestion-bot`)
4. Copy the JWT token

## License

MIT
