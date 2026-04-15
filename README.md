# OpenMetadata MCP Server

MCP server for [OpenMetadata](https://open-metadata.org/) — 147 tools covering metadata management, data lineage, search, data quality, and more. Read-only by default.

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

## Tools (147)

### Search (2)
`search-metadata` `suggest-metadata`

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

## Getting a Token

1. Open your OpenMetadata UI
2. Go to **Settings > Bots**
3. Create a new bot or use an existing one (e.g. `ingestion-bot`)
4. Copy the JWT token

## License

MIT
