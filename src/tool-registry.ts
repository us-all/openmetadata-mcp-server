import { ToolRegistry, createSearchToolsMetaTool } from "@us-all/mcp-toolkit";
import { config } from "./config.js";

/**
 * Categories used by OM_TOOLS / OM_DISABLE env toggles.
 *
 * Default: all categories enabled.
 * `OM_TOOLS=core,governance` → only these load (allowlist)
 * `OM_DISABLE=admin,events` → these excluded (denylist)
 */
export const CATEGORIES = [
  "search",          // search-metadata, suggest-metadata, semantic-search
  "core",            // tables, databases, schemas, lineage
  "discovery",       // dashboards, pipelines, charts, topics, mlmodels, containers, queries, stored-procedures
  "governance",      // glossary, classifications, tags, domains, dataproducts
  "entities",        // OM 1.12+ data assets: data contracts, metrics, search indexes, api collections, api endpoints
  "quality",         // data-quality (test suites, test cases), sample-data
  "services",        // database/dashboard/messaging/pipeline/mlmodel/storage services
  "admin",           // users, teams, access (roles + policies), bots
  "events",          // event subscriptions
  "meta",            // search-tools (always enabled)
] as const;

export type Category = (typeof CATEGORIES)[number];

export const registry = new ToolRegistry<Category>({
  enabledCategories: config.enabledCategories,
  disabledCategories: config.disabledCategories,
});

const meta = createSearchToolsMetaTool(registry, CATEGORIES,
  "Discover tools across the 154-tool OpenMetadata MCP surface — call this first to find the right tool.");

export const searchToolsSchema = meta.schema;
export const searchTools = meta.handler;
