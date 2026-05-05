import { z } from "zod/v4";
import { aggregate } from "@us-all/mcp-toolkit";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

/**
 * `quality-rollup` — aggregated DQ status across a scope (table / service /
 * domain / test-suite). Counts tests by status, surfaces the top failing
 * cases, and reports the freshest result timestamp. Replaces the recursive
 * `list-test-cases` + per-case `list-test-case-results` walk that LLMs
 * usually do when asked "what's broken in <scope>?".
 *
 * `run-test-suite` — triggers execution of a test suite via the associated
 * ingestion pipeline. Write-gated. Async — the response carries the trigger
 * ack; results land via the normal pipeline → test-case-result flow.
 */

const SCOPE_DESCRIPTION =
  "Scope filter. Provide ONE: `entityLink` (full OM link), `tableFqn` (table FQN), `testSuiteId` (UUID), `testSuiteFqn` (suite FQN), or none for org-wide.";

export const qualityRollupSchema = z.object({
  entityLink: z.string().optional()
    .describe("OM entityLink, e.g. '<#E::table::svc.db.schema.orders>'"),
  tableFqn: z.string().optional()
    .describe("Convenience: build entityLink from a table fully-qualified name"),
  testSuiteId: z.string().optional()
    .describe("Test Suite UUID — restricts to cases belonging to this suite"),
  testSuiteFqn: z.string().optional()
    .describe("Test Suite FQN — resolved to UUID before listing"),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100)
    .describe("Maximum test cases to inspect (default 100, max 500)"),
  topFailingLimit: z.coerce.number().int().min(1).max(50).optional().default(5)
    .describe("Number of top failing cases to surface in the response (default 5)"),
}).describe(SCOPE_DESCRIPTION);

interface TestCaseSummary {
  id?: string;
  name?: string;
  fullyQualifiedName?: string;
  testCaseStatus?: string;
  testCaseResult?: { testCaseStatus?: string; timestamp?: number; result?: string; testResultValue?: unknown };
  testSuite?: { fullyQualifiedName?: string };
}

function statusOf(tc: TestCaseSummary): string {
  return tc.testCaseResult?.testCaseStatus ?? tc.testCaseStatus ?? "Unknown";
}

export async function qualityRollup(params: z.infer<typeof qualityRollupSchema>) {
  const caveats: string[] = [];

  // Build the entityLink from tableFqn convenience.
  let entityLink = params.entityLink;
  if (!entityLink && params.tableFqn) {
    entityLink = `<#E::table::${params.tableFqn}>`;
  }

  // Resolve suite FQN → UUID when needed.
  let testSuiteId = params.testSuiteId;
  if (!testSuiteId && params.testSuiteFqn) {
    try {
      const suite = await omClient.get<{ id?: string }>(
        `/dataQuality/testSuites/name/${encodeURIComponent(params.testSuiteFqn)}`,
      );
      testSuiteId = suite.id;
    } catch (err) {
      caveats.push(`testSuite lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const query: Record<string, string | number | boolean | undefined> = {
    limit: params.limit,
    fields: "testSuite,testCaseStatus,testCaseResult",
  };
  if (entityLink) query.entityLink = entityLink;
  if (testSuiteId) query.testSuiteId = testSuiteId;

  const { listing } = await aggregate(
    {
      listing: () => omClient.get<{ data?: TestCaseSummary[]; paging?: { total?: number } }>(
        "/dataQuality/testCases",
        query,
      ),
    },
    caveats,
  );

  const cases = listing?.data ?? [];
  const total = listing?.paging?.total ?? cases.length;

  // Bucket by current status.
  const counts: Record<string, number> = {};
  let mostRecentTs: number | null = null;
  for (const c of cases) {
    const s = statusOf(c);
    counts[s] = (counts[s] ?? 0) + 1;
    const ts = c.testCaseResult?.timestamp;
    if (typeof ts === "number" && (mostRecentTs == null || ts > mostRecentTs)) {
      mostRecentTs = ts;
    }
  }

  // Top failing cases (Failed first, then Aborted, ordered by recency).
  const failing = cases
    .filter((c) => /Fail|Abort|Error/i.test(statusOf(c)))
    .sort((a, b) => (b.testCaseResult?.timestamp ?? 0) - (a.testCaseResult?.timestamp ?? 0))
    .slice(0, params.topFailingLimit)
    .map((c) => ({
      name: c.name ?? null,
      fqn: c.fullyQualifiedName ?? null,
      status: statusOf(c),
      result: c.testCaseResult?.result ?? null,
      lastRun: c.testCaseResult?.timestamp ?? null,
      testSuiteFqn: c.testSuite?.fullyQualifiedName ?? null,
    }));

  const success = (counts["Success"] ?? 0);
  const passRate = cases.length > 0 ? Math.round((success / cases.length) * 1000) / 10 : null;

  let scopeLabel: string;
  if (entityLink) scopeLabel = `entityLink=${entityLink}`;
  else if (testSuiteId) scopeLabel = `testSuite=${params.testSuiteFqn ?? testSuiteId}`;
  else scopeLabel = "org-wide";

  return {
    scope: { entityLink, testSuiteId, testSuiteFqn: params.testSuiteFqn ?? null, tableFqn: params.tableFqn ?? null, label: scopeLabel },
    summary: {
      casesInspected: cases.length,
      casesAvailable: total,
      truncated: total > cases.length,
      counts,
      passRatePct: passRate,
      mostRecentRunTs: mostRecentTs,
    },
    topFailing: failing,
    caveats,
  };
}

// --- run-test-suite ---

export const runTestSuiteSchema = z.object({
  pipelineFqn: z.string().optional()
    .describe("Ingestion pipeline FQN. The standard suite-execution path. Use list-pipelines or look up via OM UI."),
  pipelineId: z.string().optional()
    .describe("Ingestion pipeline UUID (alternative to pipelineFqn)"),
  testSuiteFqn: z.string().optional()
    .describe("Test Suite FQN — resolved to its associated pipeline before triggering. Skipped if pipelineFqn/Id provided."),
});

interface PipelineRef {
  id?: string;
  fullyQualifiedName?: string;
}

interface TestSuiteResp {
  pipelines?: PipelineRef[];
}

export async function runTestSuite(params: z.infer<typeof runTestSuiteSchema>) {
  assertWriteAllowed();

  const caveats: string[] = [];

  let pipelineFqn = params.pipelineFqn;
  let pipelineId = params.pipelineId;

  if (!pipelineFqn && !pipelineId && params.testSuiteFqn) {
    try {
      const suite = await omClient.get<TestSuiteResp>(
        `/dataQuality/testSuites/name/${encodeURIComponent(params.testSuiteFqn)}`,
        { fields: "pipelines" },
      );
      const first = suite.pipelines?.[0];
      pipelineFqn = first?.fullyQualifiedName;
      pipelineId = first?.id;
      if (!pipelineFqn && !pipelineId) {
        caveats.push(`testSuite '${params.testSuiteFqn}' has no associated pipelines — nothing to trigger`);
      }
    } catch (err) {
      caveats.push(`testSuite lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!pipelineFqn && !pipelineId) {
    return {
      triggered: false,
      caveats: [
        ...caveats,
        "No pipelineFqn / pipelineId / testSuiteFqn-resolved pipeline available. Provide one of these arguments.",
      ],
    };
  }

  // OM exposes both /trigger/{id} and /trigger/{name}.
  const path = pipelineId
    ? `/services/ingestionPipelines/trigger/${pipelineId}`
    : `/services/ingestionPipelines/trigger/${encodeURIComponent(pipelineFqn!)}`;

  const response = await omClient.post(path, {});

  return {
    triggered: true,
    pipelineFqn: pipelineFqn ?? null,
    pipelineId: pipelineId ?? null,
    response,
    caveats,
  };
}
