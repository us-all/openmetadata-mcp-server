import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// MCP Prompts: pre-built workflow templates that clients can invoke. Each
// returns a user-facing instruction the LLM should follow, leveraging the
// already-registered OpenMetadata tools.

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "lineage-impact-analysis",
    {
      title: "Lineage impact analysis",
      description:
        "Walk lineage from an entity to identify downstream/upstream entities at risk and the owners to notify before a breaking change.",
      argsSchema: {
        entityFqn: z
          .string()
          .describe(
            "Fully qualified name of the entity, e.g. 'serviceName.databaseName.schemaName.tableName' (or matching FQN for topic/dashboard/pipeline/mlmodel/container)",
          ),
        direction: z
          .string()
          .optional()
          .describe("'upstream' | 'downstream' | 'both' (default: 'downstream')"),
        depth: z.string().optional().describe("Lineage depth to traverse (default: '3')"),
      },
    },
    ({ entityFqn, direction, depth }) => {
      const dir = direction ?? "downstream";
      const d = depth ?? "3";
      const upstreamDepth = dir === "downstream" ? "0" : d;
      const downstreamDepth = dir === "upstream" ? "0" : d;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Perform a lineage impact analysis for ${entityFqn} (direction='${dir}', depth=${d}).`,
                "",
                "Steps:",
                `1. Identify the entity type from the FQN prefix and call the matching by-name tool to fetch the entity (e.g. \`get-table-by-name\` for tables, \`get-topic-by-name\` for topics, \`get-dashboard-by-name\` for dashboards, \`get-pipeline-by-name\` for pipelines, \`get-ml-model-by-name\` for ML models, \`get-container-by-name\` for containers). Pass fields='owners,tags,domain' so the source entity's owners are included.`,
                `2. Call \`get-lineage-by-name\` with entity=<resolved type> (one of 'table' | 'topic' | 'dashboard' | 'pipeline' | 'mlmodel' | 'container'), fqn=${JSON.stringify(entityFqn)}, upstreamDepth=${upstreamDepth}, downstreamDepth=${downstreamDepth}.`,
                "3. Walk the response edges (`upstreamEdges` / `downstreamEdges`) and collect the unique affected entity FQNs and their entity types from `nodes`.",
                "4. For each affected entity, call the corresponding `get-<type>-by-name` tool with fields='owners,tags' to retrieve current owners. De-duplicate owners across entities.",
                "5. Produce an impact report with:",
                "   - Blast radius: count of affected entities grouped by entity type and depth level.",
                "   - Entities at risk: a table of FQN, type, depth, owners (name + email).",
                "   - Owners to notify: de-duplicated list of users/teams with the entities they own in this blast radius.",
                "   - Recommended next steps (e.g. announce in #data-platform, open a change ticket, schedule downtime).",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "data-quality-investigation",
    {
      title: "Data quality investigation",
      description:
        "Inspect a table's data quality test cases, group recent failures by severity, and propose remediation steps per failing test.",
      argsSchema: {
        tableFqn: z.string().describe("Fully qualified name of the table to investigate"),
        sinceDays: z
          .string()
          .optional()
          .describe("Look back this many days for test results (default: '7')"),
      },
    },
    ({ tableFqn, sinceDays }) => {
      const window = sinceDays ?? "7";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Investigate data quality for ${tableFqn} over the last ${window} days.`,
                "",
                "Steps:",
                `1. Call \`get-table-by-name\` with fqn=${JSON.stringify(tableFqn)}, fields='owners,tags,testSuite' to anchor the entity and surface its TestSuite.`,
                `2. Call \`list-test-cases\` with entityLink='<#E::table::${tableFqn}>' (URL-encoded) and includeAllTests=true to enumerate test cases attached to this table (column- and table-level).`,
                `3. Compute startTs = (now - ${window} days) in epoch milliseconds, endTs = now in epoch milliseconds.`,
                "4. For each test case fqn from step 2, call `list-test-case-results` with testCaseFqn=<fqn>, startTs=<startTs>, endTs=<endTs>.",
                "5. Aggregate: classify each result as Success / Failed / Aborted; group failures by `testCase.severity` (Critical/High/Medium/Low) and by test definition name.",
                "6. Produce a remediation report containing:",
                "   - Summary table: total tests, passing, failing, aborted, and failure rate.",
                "   - Failures grouped by severity, with: testCaseFqn, parameter values, last failure timestamp, failure message.",
                "   - Per failing test: a proposed remediation (e.g. backfill, fix upstream nullability, tighten ingestion contract, raise an incident, adjust threshold).",
                "   - Owners (from step 1) to ping for each high/critical failure.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "glossary-term-bootstrap",
    {
      title: "Glossary term bootstrap from a table",
      description:
        "Scan a table's columns for ambiguous names/descriptions, propose glossary terms (de-duplicated against an existing glossary), and emit ready-to-run create-glossary-term calls.",
      argsSchema: {
        tableFqn: z.string().describe("Fully qualified name of the source table"),
        glossaryName: z
          .string()
          .describe(
            "Name (or FQN) of the target glossary that proposed terms should live under",
          ),
      },
    },
    ({ tableFqn, glossaryName }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Bootstrap glossary terms for ${tableFqn} into glossary '${glossaryName}'.`,
              "",
              "Steps:",
              `1. Call \`get-table-by-name\` with fqn=${JSON.stringify(tableFqn)}, fields='columns,tags,owners'. Capture each column's name, dataType, description, and any existing glossary term tags.`,
              "2. For each column, score ambiguity:",
              "   - Empty / placeholder description (e.g. <2 sentences, contains 'TODO', mirrors the column name).",
              "   - Cryptic name (acronym, all-caps abbreviation, codes like `cd`, `cnt`, `amt`).",
              "   - Missing or generic glossary tag.",
              "   Drop columns that are already well-described and tagged.",
              "3. For each ambiguous column, draft a candidate glossary term: { name (PascalCase), definition (1-2 sentences derived from column semantics + dataType), synonyms[], relatedColumns[] }.",
              `4. Call \`list-glossary-terms\` with glossary=${JSON.stringify(glossaryName)}, limit=200 (paginate via 'after' if needed). Build a set of existing term names + synonyms (case-insensitive).`,
              "5. Drop or rename candidates that collide with an existing term; for near-matches add the column as a related-column to the existing term instead of creating a duplicate.",
              "6. Emit the resulting create plan as a markdown table AND as a list of ready-to-run tool calls in the form:",
              `   \`create-glossary-term\` with arguments { glossary: ${JSON.stringify(glossaryName)}, name: '<TermName>', description: '<definition>', synonyms: [...], references: [...] }.`,
              "7. Remind the user that `create-glossary-term` is gated by `OPENMETADATA_ALLOW_WRITE=true` and will no-op if writes are disabled.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "data-contract-bootstrap",
    {
      title: "Bootstrap a Data Contract from an existing table (OM 1.12+)",
      description:
        "Read-only audit that compiles a draft Data Contract for a table — schema rules from columns, quality rules from existing test cases, owners from entity owners, freshness from ingestion stats. Outputs a ready-to-apply JSON spec; the user creates the contract manually since write tools for Data Contracts are not yet exposed.",
      argsSchema: {
        tableFqn: z
          .string()
          .describe("Fully qualified name of the table to bootstrap a contract for"),
        contractName: z
          .string()
          .optional()
          .describe(
            "Name for the new contract (default: '<tableName>-contract')",
          ),
        includeQualityRules: z
          .string()
          .optional()
          .describe("'true' (default) to pull existing test cases as quality rules"),
        includeSampleData: z
          .string()
          .optional()
          .describe(
            "'true' (default) to pull sample data and infer NOT NULL / range constraints",
          ),
      },
    },
    ({ tableFqn, contractName, includeQualityRules, includeSampleData }) => {
      const cn = contractName ?? `${tableFqn.split(".").pop()}-contract`;
      const useQuality = includeQualityRules !== "false";
      const useSample = includeSampleData !== "false";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Bootstrap a Data Contract for table ${tableFqn} (contract name '${cn}').`,
                "",
                "Steps:",
                `1. Call \`get-table-by-name\` with fqn=${JSON.stringify(tableFqn)}, fields='columns,owners,tags,domain,testSuite,changeDescription'. Capture columns (name, dataType, dataLength, constraint, description), owners (id, type, name), domain.fullyQualifiedName, and testSuite (if any).`,
                `2. Check for an existing contract on this entity: \`list-data-contracts\` with fields='owners,entity', then filter the response in-memory for entries whose \`entity.fullyQualifiedName === ${JSON.stringify(tableFqn)}\`. If one already exists, surface its name + status and stop with a note that bootstrap should not duplicate.`,
                useQuality
                  ? "3. Pull quality rules: `list-test-cases` with `entityLink='<#E::table::" + tableFqn + ">'` and `includeAllTests=true`. For each test case capture: testDefinition.name, testDefinition.entityType (TABLE | COLUMN), parameterValues, severity. These map to the contract's `qualityExpectations`."
                  : "3. Skip quality rules (includeQualityRules=false).",
                useSample
                  ? "4. Pull sample data: `get-table-sample-data-by-name` with fqn=" + JSON.stringify(tableFqn) + ", limit=100. Use it to *infer* schema rules (do not promise them as truth):\n   - column has zero nulls in sample → suggest `required: true` (NOT NULL).\n   - numeric column min/max range → suggest `range` quality rule with the observed bounds + 20% padding.\n   - string column distinct values < 20 → suggest `enum` rule with the distinct values.\n   - all rows match a regex (email/url/uuid/iso-date) → suggest `pattern` rule.\n   Mark each inferred rule as **inferred** in the output so the reviewer can tighten them."
                  : "4. Skip sample-data-driven inference (includeSampleData=false).",
                "5. Compile the draft contract spec as JSON:",
                "   ```jsonc",
                "   {",
                `     \"name\": ${JSON.stringify(cn)},`,
                "     \"entity\": { \"type\": \"table\", \"fullyQualifiedName\": " + JSON.stringify(tableFqn) + " },",
                "     \"owners\": [ /* from step 1 */ ],",
                "     \"schema\": [",
                "       /* per column: { name, dataType, required, constraint, description } */",
                "     ],",
                "     \"qualityExpectations\": [",
                "       /* from step 3 (existing tests) and step 4 (inferred rules), tagged with source */",
                "     ],",
                "     \"semantics\": [",
                "       /* glossary term refs from columns[].tags where tagFQN starts with 'Glossary.' */",
                "     ],",
                "     \"sla\": { \"freshness\": null, \"completeness\": null }",
                "   }",
                "   ```",
                "6. Final output:",
                "   - **Existing contract**: name + status if step 2 found one (or 'none').",
                "   - **Draft spec**: the JSON from step 5 inside a code block.",
                "   - **Confidence notes**: which fields came from existing tests (high confidence) vs sample-data inference (review before applying).",
                "   - **Apply hint**: 'Data Contract write tool is not yet exposed in this MCP — copy the JSON above into the OM UI: Settings → Data Contracts → New, or POST to `/api/v1/dataContracts` directly.'",
                "7. IMPORTANT: do NOT call any `update-*` / `create-*` / `delete-*` tools. This prompt is a read-only audit + drafting workflow.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "owner-change-propagation",
    {
      title: "Owner change propagation audit",
      description:
        "Audit ownership across all assets in a domain and produce a checklist of updates needed to assign a new owner. Read-only audit; the user runs the actual updates.",
      argsSchema: {
        domainFqn: z.string().describe("Fully qualified name of the domain"),
        newOwnerEmail: z
          .string()
          .describe("Email of the user (or team) that should become the new owner"),
      },
    },
    ({ domainFqn, newOwnerEmail }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Audit ownership in domain '${domainFqn}' and produce a propagation checklist for new owner '${newOwnerEmail}'.`,
              "",
              "Steps:",
              `1. Call \`get-domain-by-name\` with fqn=${JSON.stringify(domainFqn)}, fields='owners,experts,assets'. Capture domain-level owners.`,
              `2. Resolve the new owner: call \`get-user-by-name\` with name derived from the email local-part (or fall back to \`list-users\` with a name-prefix). Capture the resolved user/team UUID.`,
              `3. Enumerate assets under the domain — call each of these with domain=${JSON.stringify(domainFqn)}, limit=200 (paginate via 'after' until exhausted), fields='owners':`,
              "   - `list-data-products`",
              "   - `list-tables`",
              "   - `list-dashboards`",
              "   - `list-pipelines`",
              "   - `list-topics`",
              "   - `list-ml-models`",
              "   - `list-containers`",
              "4. For each asset, compare current owners[] to the new owner UUID. Classify as:",
              "   - 'no-change' (already owned by the new owner)",
              "   - 'add-owner' (no owner set, or only legacy owners that should be replaced)",
              "   - 'review' (multiple existing owners — confirm before overwriting)",
              "5. Produce an audit report:",
              "   - Asset inventory grouped by entity type with current owners.",
              "   - Checklist of updates: { entityType, fqn, currentOwners, action } sorted by action.",
              "   - Suggested follow-up: a JSON-Patch payload per entity that the user can apply via `update-<type>` (e.g. `update-table`, `update-dashboard`).",
              "6. IMPORTANT: do NOT call any `update-*` / `create-*` / `delete-*` tools yourself. Writes are gated by `OPENMETADATA_ALLOW_WRITE=true`. This prompt only audits and lists; the user runs the updates manually if write mode is enabled.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
