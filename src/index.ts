#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./config.js";
import { wrapToolHandler } from "./tools/utils.js";

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const { version: pkgVersion } = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };

// Tool imports
import { searchMetadataSchema, searchMetadata, suggestMetadataSchema, suggestMetadata } from "./tools/search.js";
import {
  listTablesSchema, listTables, getTableSchema, getTable,
  getTableByNameSchema, getTableByName, createTableSchema, createTable,
  updateTableSchema, updateTable, deleteTableSchema, deleteTable,
} from "./tools/tables.js";
import {
  listDatabasesSchema, listDatabases, getDatabaseSchema, getDatabase,
  getDatabaseByNameSchema, getDatabaseByName, createDatabaseSchema, createDatabase,
  updateDatabaseSchema, updateDatabase, deleteDatabaseSchema, deleteDatabase,
} from "./tools/databases.js";
import {
  listSchemasSchema, listSchemas, getSchemaSchema, getSchema,
  getSchemaByNameSchema, getSchemaByName, createSchemaSchema, createSchema,
  updateSchemaSchema, updateSchema, deleteSchemaSchema, deleteSchema,
} from "./tools/schemas.js";
import {
  getLineageSchema, getLineage, getLineageByNameSchema, getLineageByName,
  addLineageSchema, addLineage, deleteLineageSchema, deleteLineage,
} from "./tools/lineage.js";
import {
  listDatabaseServicesSchema, listDatabaseServices, getDatabaseServiceSchema, getDatabaseService,
  getDatabaseServiceByNameSchema, getDatabaseServiceByName,
  createDatabaseServiceSchema, createDatabaseService, updateDatabaseServiceSchema, updateDatabaseService,
  deleteDatabaseServiceSchema, deleteDatabaseService,
  listDashboardServicesSchema, listDashboardServices, getDashboardServiceSchema, getDashboardService,
  listMessagingServicesSchema, listMessagingServices, getMessagingServiceSchema, getMessagingService,
  listPipelineServicesSchema, listPipelineServices, getPipelineServiceSchema, getPipelineService,
  listMlModelServicesSchema, listMlModelServices, getMlModelServiceSchema, getMlModelService,
  listStorageServicesSchema, listStorageServices, getStorageServiceSchema, getStorageService,
} from "./tools/services.js";
import {
  listGlossariesSchema, listGlossaries, getGlossarySchema, getGlossary,
  getGlossaryByNameSchema, getGlossaryByName, createGlossarySchema, createGlossary,
  updateGlossarySchema, updateGlossary, deleteGlossarySchema, deleteGlossary,
  listGlossaryTermsSchema, listGlossaryTerms, getGlossaryTermSchema, getGlossaryTerm,
  getGlossaryTermByNameSchema, getGlossaryTermByName, createGlossaryTermSchema, createGlossaryTerm,
  updateGlossaryTermSchema, updateGlossaryTerm, deleteGlossaryTermSchema, deleteGlossaryTerm,
} from "./tools/glossary.js";
import {
  listDashboardsSchema, listDashboards, getDashboardSchema, getDashboard,
  getDashboardByNameSchema, getDashboardByName, createDashboardSchema, createDashboard,
  updateDashboardSchema, updateDashboard, deleteDashboardSchema, deleteDashboard,
} from "./tools/dashboards.js";
import {
  listPipelinesSchema, listPipelines, getPipelineSchema, getPipeline,
  getPipelineByNameSchema, getPipelineByName, createPipelineSchema, createPipeline,
  updatePipelineSchema, updatePipeline, deletePipelineSchema, deletePipeline,
} from "./tools/pipelines.js";
import {
  listTopicsSchema, listTopics, getTopicSchema, getTopic,
  getTopicByNameSchema, getTopicByName, createTopicSchema, createTopic,
  updateTopicSchema, updateTopic, deleteTopicSchema, deleteTopic,
} from "./tools/topics.js";
import {
  listChartsSchema, listCharts, getChartSchema, getChart,
  getChartByNameSchema, getChartByName, createChartSchema, createChart,
  updateChartSchema, updateChart, deleteChartSchema, deleteChart,
} from "./tools/charts.js";
import {
  listContainersSchema, listContainers, getContainerSchema, getContainer,
  getContainerByNameSchema, getContainerByName, createContainerSchema, createContainer,
  updateContainerSchema, updateContainer, deleteContainerSchema, deleteContainer,
} from "./tools/containers.js";
import {
  listMlModelsSchema, listMlModels, getMlModelSchema, getMlModel,
  getMlModelByNameSchema, getMlModelByName, createMlModelSchema, createMlModel,
  updateMlModelSchema, updateMlModel, deleteMlModelSchema, deleteMlModel,
} from "./tools/mlmodels.js";
import {
  listClassificationsSchema, listClassifications, getClassificationSchema, getClassification,
  createClassificationSchema, createClassification, deleteClassificationSchema, deleteClassification,
  listTagsSchema, listTags, getTagSchema, getTag, getTagByNameSchema, getTagByName,
  createTagSchema, createTag, updateTagSchema, updateTag, deleteTagSchema, deleteTag,
} from "./tools/tags.js";
import {
  listDomainsSchema, listDomains, getDomainSchema, getDomain,
  getDomainByNameSchema, getDomainByName, createDomainSchema, createDomain,
  updateDomainSchema, updateDomain, deleteDomainSchema, deleteDomain,
  listDataProductsSchema, listDataProducts, getDataProductSchema, getDataProduct,
  getDataProductByNameSchema, getDataProductByName, createDataProductSchema, createDataProduct,
  updateDataProductSchema, updateDataProduct, deleteDataProductSchema, deleteDataProduct,
} from "./tools/domains.js";
import { listUsersSchema, listUsers, getUserSchema, getUser, getUserByNameSchema, getUserByName } from "./tools/users.js";
import {
  listTeamsSchema, listTeams, getTeamSchema, getTeam,
  getTeamByNameSchema, getTeamByName, createTeamSchema, createTeam,
  updateTeamSchema, updateTeam, deleteTeamSchema, deleteTeam,
} from "./tools/teams.js";
import { listRolesSchema, listRoles, getRoleSchema, getRole, listPoliciesSchema, listPolicies, getPolicySchema, getPolicy } from "./tools/access.js";
import {
  listTestSuitesSchema, listTestSuites, getTestSuiteSchema, getTestSuite,
  getTestSuiteByNameSchema, getTestSuiteByName, listTestCasesSchema, listTestCases,
  getTestCaseSchema, getTestCase, getTestCaseByNameSchema, getTestCaseByName,
  listTestCaseResultsSchema, listTestCaseResults,
} from "./tools/data-quality.js";
import {
  listStoredProceduresSchema, listStoredProcedures, getStoredProcedureSchema, getStoredProcedure,
  getStoredProcedureByNameSchema, getStoredProcedureByName,
  createStoredProcedureSchema, createStoredProcedure, updateStoredProcedureSchema, updateStoredProcedure,
  deleteStoredProcedureSchema, deleteStoredProcedure,
} from "./tools/stored-procedures.js";
import {
  listQueriesSchema, listQueries, getQuerySchema, getQuery,
  createQuerySchema, createQuery, updateQuerySchema, updateQuery,
  deleteQuerySchema, deleteQuery,
} from "./tools/queries.js";
import { listEventsSchema, listEvents, getEventSubscriptionSchema, getEventSubscription, getEventSubscriptionByNameSchema, getEventSubscriptionByName } from "./tools/events.js";
import { listBotsSchema, listBots, getBotSchema, getBot, getBotByNameSchema, getBotByName } from "./tools/bots.js";
import {
  getTableSampleDataSchema, getTableSampleData,
  getTableSampleDataByNameSchema, getTableSampleDataByName,
  getTopicSampleDataSchema, getTopicSampleData,
  getTopicSampleDataByNameSchema, getTopicSampleDataByName,
  getContainerSampleDataSchema, getContainerSampleData,
  getContainerSampleDataByNameSchema, getContainerSampleDataByName,
} from "./tools/sample-data.js";
import { semanticSearchSchema, semanticSearch } from "./tools/semantic-search.js";
import { getTableSummarySchema, getTableSummary, getDomainSummarySchema, getDomainSummary } from "./tools/aggregations.js";
import {
  listDataContractsSchema, listDataContracts, getDataContractByNameSchema, getDataContractByName,
  listMetricsSchema, listMetrics, getMetricByNameSchema, getMetricByName,
  listSearchIndexesSchema, listSearchIndexes, getSearchIndexByNameSchema, getSearchIndexByName,
  listApiCollectionsSchema, listApiCollections, getApiCollectionByNameSchema, getApiCollectionByName,
  listApiEndpointsSchema, listApiEndpoints, getApiEndpointByNameSchema, getApiEndpointByName,
} from "./tools/governance-entities.js";
import { registry, searchToolsSchema, searchTools, type Category } from "./tool-registry.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

validateConfig();

const server = new McpServer({
  name: "openmetadata",
  version: pkgVersion,
});

// --- Tool registration with category-based filtering (OM_TOOLS / OM_DISABLE) ---
let currentCategory: Category = "search";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tool(name: string, description: string, schema: any, handler: any): void {
  registry.register(name, description, currentCategory);
  if (registry.isEnabled(currentCategory)) {
    server.tool(name, description, schema, handler);
  }
}

// --- Search ---
currentCategory = "search";

tool("search-metadata", "Search OpenMetadata entities (tables, topics, dashboards, pipelines, glossary terms, etc.) by keyword", searchMetadataSchema.shape, wrapToolHandler(searchMetadata));
tool("suggest-metadata", "Get autocomplete suggestions for OpenMetadata entity names", suggestMetadataSchema.shape, wrapToolHandler(suggestMetadata));
tool("semantic-search", "Natural-language semantic search over OpenMetadata entities using vector embeddings (requires OM 1.12+ with semantic search enabled)", semanticSearchSchema.shape, wrapToolHandler(semanticSearch));

// --- Tables ---
currentCategory = "core";

tool("list-tables", "List tables with pagination and optional field expansion", listTablesSchema.shape, wrapToolHandler(listTables));
tool("get-table", "Get table details by UUID", getTableSchema.shape, wrapToolHandler(getTable));
tool("get-table-by-name", "Get table details by fully qualified name", getTableByNameSchema.shape, wrapToolHandler(getTableByName));
tool("create-table", "Create a new table in OpenMetadata", createTableSchema.shape, wrapToolHandler(createTable));
tool("update-table", "Update a table using JSON Patch operations", updateTableSchema.shape, wrapToolHandler(updateTable));
tool("delete-table", "Delete a table by UUID", deleteTableSchema.shape, wrapToolHandler(deleteTable));

// --- Databases ---

tool("list-databases", "List databases with pagination and service filtering", listDatabasesSchema.shape, wrapToolHandler(listDatabases));
tool("get-database", "Get database details by UUID", getDatabaseSchema.shape, wrapToolHandler(getDatabase));
tool("get-database-by-name", "Get database details by fully qualified name", getDatabaseByNameSchema.shape, wrapToolHandler(getDatabaseByName));
tool("create-database", "Create a new database in OpenMetadata", createDatabaseSchema.shape, wrapToolHandler(createDatabase));
tool("update-database", "Update a database using JSON Patch operations", updateDatabaseSchema.shape, wrapToolHandler(updateDatabase));
tool("delete-database", "Delete a database by UUID", deleteDatabaseSchema.shape, wrapToolHandler(deleteDatabase));

// --- Database Schemas ---

tool("list-schemas", "List database schemas with pagination", listSchemasSchema.shape, wrapToolHandler(listSchemas));
tool("get-schema", "Get database schema details by UUID", getSchemaSchema.shape, wrapToolHandler(getSchema));
tool("get-schema-by-name", "Get database schema details by fully qualified name", getSchemaByNameSchema.shape, wrapToolHandler(getSchemaByName));
tool("create-schema", "Create a new database schema", createSchemaSchema.shape, wrapToolHandler(createSchema));
tool("update-schema", "Update a database schema using JSON Patch operations", updateSchemaSchema.shape, wrapToolHandler(updateSchema));
tool("delete-schema", "Delete a database schema by UUID", deleteSchemaSchema.shape, wrapToolHandler(deleteSchema));

// --- Lineage ---

tool("get-lineage", "Get upstream and downstream lineage for an entity by UUID", getLineageSchema.shape, wrapToolHandler(getLineage));
tool("get-lineage-by-name", "Get upstream and downstream lineage for an entity by FQN", getLineageByNameSchema.shape, wrapToolHandler(getLineageByName));
tool("add-lineage", "Add or update lineage edge between two entities", addLineageSchema.shape, wrapToolHandler(addLineage));
tool("delete-lineage", "Delete a lineage edge between two entities", deleteLineageSchema.shape, wrapToolHandler(deleteLineage));

// --- Database Services ---
currentCategory = "services";

tool("list-database-services", "List database services (connectors)", listDatabaseServicesSchema.shape, wrapToolHandler(listDatabaseServices));
tool("get-database-service", "Get database service details by UUID", getDatabaseServiceSchema.shape, wrapToolHandler(getDatabaseService));
tool("get-database-service-by-name", "Get database service by name", getDatabaseServiceByNameSchema.shape, wrapToolHandler(getDatabaseServiceByName));
tool("create-database-service", "Create a new database service connector", createDatabaseServiceSchema.shape, wrapToolHandler(createDatabaseService));
tool("update-database-service", "Update a database service using JSON Patch", updateDatabaseServiceSchema.shape, wrapToolHandler(updateDatabaseService));
tool("delete-database-service", "Delete a database service", deleteDatabaseServiceSchema.shape, wrapToolHandler(deleteDatabaseService));

// --- Dashboard Services ---

tool("list-dashboard-services", "List dashboard services", listDashboardServicesSchema.shape, wrapToolHandler(listDashboardServices));
tool("get-dashboard-service", "Get dashboard service by name", getDashboardServiceSchema.shape, wrapToolHandler(getDashboardService));

// --- Messaging Services ---

tool("list-messaging-services", "List messaging services (Kafka, etc.)", listMessagingServicesSchema.shape, wrapToolHandler(listMessagingServices));
tool("get-messaging-service", "Get messaging service by name", getMessagingServiceSchema.shape, wrapToolHandler(getMessagingService));

// --- Pipeline Services ---

tool("list-pipeline-services", "List pipeline services (Airflow, etc.)", listPipelineServicesSchema.shape, wrapToolHandler(listPipelineServices));
tool("get-pipeline-service", "Get pipeline service by name", getPipelineServiceSchema.shape, wrapToolHandler(getPipelineService));

// --- ML Model Services ---

tool("list-ml-model-services", "List ML model services", listMlModelServicesSchema.shape, wrapToolHandler(listMlModelServices));
tool("get-ml-model-service", "Get ML model service by name", getMlModelServiceSchema.shape, wrapToolHandler(getMlModelService));

// --- Storage Services ---

tool("list-storage-services", "List storage services (S3, GCS, etc.)", listStorageServicesSchema.shape, wrapToolHandler(listStorageServices));
tool("get-storage-service", "Get storage service by name", getStorageServiceSchema.shape, wrapToolHandler(getStorageService));

// --- Glossaries ---
currentCategory = "governance";

tool("list-glossaries", "List glossaries with pagination", listGlossariesSchema.shape, wrapToolHandler(listGlossaries));
tool("get-glossary", "Get glossary details by UUID", getGlossarySchema.shape, wrapToolHandler(getGlossary));
tool("get-glossary-by-name", "Get glossary details by name", getGlossaryByNameSchema.shape, wrapToolHandler(getGlossaryByName));
tool("create-glossary", "Create a new glossary for business terms", createGlossarySchema.shape, wrapToolHandler(createGlossary));
tool("update-glossary", "Update a glossary using JSON Patch operations", updateGlossarySchema.shape, wrapToolHandler(updateGlossary));
tool("delete-glossary", "Delete a glossary by UUID", deleteGlossarySchema.shape, wrapToolHandler(deleteGlossary));

// --- Glossary Terms ---

tool("list-glossary-terms", "List glossary terms with pagination and glossary filtering", listGlossaryTermsSchema.shape, wrapToolHandler(listGlossaryTerms));
tool("get-glossary-term", "Get glossary term details by UUID", getGlossaryTermSchema.shape, wrapToolHandler(getGlossaryTerm));
tool("get-glossary-term-by-name", "Get glossary term by fully qualified name", getGlossaryTermByNameSchema.shape, wrapToolHandler(getGlossaryTermByName));
tool("create-glossary-term", "Create a new glossary term", createGlossaryTermSchema.shape, wrapToolHandler(createGlossaryTerm));
tool("update-glossary-term", "Update a glossary term using JSON Patch operations", updateGlossaryTermSchema.shape, wrapToolHandler(updateGlossaryTerm));
tool("delete-glossary-term", "Delete a glossary term by UUID", deleteGlossaryTermSchema.shape, wrapToolHandler(deleteGlossaryTerm));

// --- Dashboards ---
currentCategory = "discovery";

tool("list-dashboards", "List dashboards with pagination and service filtering", listDashboardsSchema.shape, wrapToolHandler(listDashboards));
tool("get-dashboard", "Get dashboard details by UUID", getDashboardSchema.shape, wrapToolHandler(getDashboard));
tool("get-dashboard-by-name", "Get dashboard by fully qualified name", getDashboardByNameSchema.shape, wrapToolHandler(getDashboardByName));
tool("create-dashboard", "Create a new dashboard", createDashboardSchema.shape, wrapToolHandler(createDashboard));
tool("update-dashboard", "Update a dashboard using JSON Patch operations", updateDashboardSchema.shape, wrapToolHandler(updateDashboard));
tool("delete-dashboard", "Delete a dashboard by UUID", deleteDashboardSchema.shape, wrapToolHandler(deleteDashboard));

// --- Pipelines ---

tool("list-pipelines", "List pipelines with pagination and service filtering", listPipelinesSchema.shape, wrapToolHandler(listPipelines));
tool("get-pipeline", "Get pipeline details by UUID", getPipelineSchema.shape, wrapToolHandler(getPipeline));
tool("get-pipeline-by-name", "Get pipeline by fully qualified name", getPipelineByNameSchema.shape, wrapToolHandler(getPipelineByName));
tool("create-pipeline", "Create a new pipeline", createPipelineSchema.shape, wrapToolHandler(createPipeline));
tool("update-pipeline", "Update a pipeline using JSON Patch operations", updatePipelineSchema.shape, wrapToolHandler(updatePipeline));
tool("delete-pipeline", "Delete a pipeline by UUID", deletePipelineSchema.shape, wrapToolHandler(deletePipeline));

// --- Topics ---

tool("list-topics", "List topics (Kafka, etc.) with pagination", listTopicsSchema.shape, wrapToolHandler(listTopics));
tool("get-topic", "Get topic details by UUID", getTopicSchema.shape, wrapToolHandler(getTopic));
tool("get-topic-by-name", "Get topic by fully qualified name", getTopicByNameSchema.shape, wrapToolHandler(getTopicByName));
tool("create-topic", "Create a new topic", createTopicSchema.shape, wrapToolHandler(createTopic));
tool("update-topic", "Update a topic using JSON Patch operations", updateTopicSchema.shape, wrapToolHandler(updateTopic));
tool("delete-topic", "Delete a topic by UUID", deleteTopicSchema.shape, wrapToolHandler(deleteTopic));

// --- Charts ---

tool("list-charts", "List charts with pagination and service filtering", listChartsSchema.shape, wrapToolHandler(listCharts));
tool("get-chart", "Get chart details by UUID", getChartSchema.shape, wrapToolHandler(getChart));
tool("get-chart-by-name", "Get chart by fully qualified name", getChartByNameSchema.shape, wrapToolHandler(getChartByName));
tool("create-chart", "Create a new chart", createChartSchema.shape, wrapToolHandler(createChart));
tool("update-chart", "Update a chart using JSON Patch operations", updateChartSchema.shape, wrapToolHandler(updateChart));
tool("delete-chart", "Delete a chart by UUID", deleteChartSchema.shape, wrapToolHandler(deleteChart));

// --- Containers ---

tool("list-containers", "List storage containers with pagination", listContainersSchema.shape, wrapToolHandler(listContainers));
tool("get-container", "Get container details by UUID", getContainerSchema.shape, wrapToolHandler(getContainer));
tool("get-container-by-name", "Get container by fully qualified name", getContainerByNameSchema.shape, wrapToolHandler(getContainerByName));
tool("create-container", "Create a new storage container", createContainerSchema.shape, wrapToolHandler(createContainer));
tool("update-container", "Update a container using JSON Patch operations", updateContainerSchema.shape, wrapToolHandler(updateContainer));
tool("delete-container", "Delete a container by UUID", deleteContainerSchema.shape, wrapToolHandler(deleteContainer));

// --- ML Models ---

tool("list-ml-models", "List ML models with pagination and service filtering", listMlModelsSchema.shape, wrapToolHandler(listMlModels));
tool("get-ml-model", "Get ML model details by UUID", getMlModelSchema.shape, wrapToolHandler(getMlModel));
tool("get-ml-model-by-name", "Get ML model by fully qualified name", getMlModelByNameSchema.shape, wrapToolHandler(getMlModelByName));
tool("create-ml-model", "Create a new ML model", createMlModelSchema.shape, wrapToolHandler(createMlModel));
tool("update-ml-model", "Update an ML model using JSON Patch operations", updateMlModelSchema.shape, wrapToolHandler(updateMlModel));
tool("delete-ml-model", "Delete an ML model by UUID", deleteMlModelSchema.shape, wrapToolHandler(deleteMlModel));

// --- Classifications ---
currentCategory = "governance";

tool("list-classifications", "List tag classifications", listClassificationsSchema.shape, wrapToolHandler(listClassifications));
tool("get-classification", "Get classification details by name", getClassificationSchema.shape, wrapToolHandler(getClassification));
tool("create-classification", "Create a new tag classification", createClassificationSchema.shape, wrapToolHandler(createClassification));
tool("delete-classification", "Delete a tag classification", deleteClassificationSchema.shape, wrapToolHandler(deleteClassification));

// --- Tags ---

tool("list-tags", "List tags with pagination and classification filtering", listTagsSchema.shape, wrapToolHandler(listTags));
tool("get-tag", "Get tag details by UUID", getTagSchema.shape, wrapToolHandler(getTag));
tool("get-tag-by-name", "Get tag by fully qualified name", getTagByNameSchema.shape, wrapToolHandler(getTagByName));
tool("create-tag", "Create a new tag under a classification", createTagSchema.shape, wrapToolHandler(createTag));
tool("update-tag", "Update a tag using JSON Patch operations", updateTagSchema.shape, wrapToolHandler(updateTag));
tool("delete-tag", "Delete a tag by UUID", deleteTagSchema.shape, wrapToolHandler(deleteTag));

// --- Domains ---

tool("list-domains", "List domains with pagination", listDomainsSchema.shape, wrapToolHandler(listDomains));
tool("get-domain", "Get domain details by UUID", getDomainSchema.shape, wrapToolHandler(getDomain));
tool("get-domain-by-name", "Get domain by name", getDomainByNameSchema.shape, wrapToolHandler(getDomainByName));
tool("create-domain", "Create a new domain", createDomainSchema.shape, wrapToolHandler(createDomain));
tool("update-domain", "Update a domain using JSON Patch operations", updateDomainSchema.shape, wrapToolHandler(updateDomain));
tool("delete-domain", "Delete a domain by UUID", deleteDomainSchema.shape, wrapToolHandler(deleteDomain));

// --- Data Products ---

tool("list-data-products", "List data products with pagination", listDataProductsSchema.shape, wrapToolHandler(listDataProducts));
tool("get-data-product", "Get data product details by UUID", getDataProductSchema.shape, wrapToolHandler(getDataProduct));
tool("get-data-product-by-name", "Get data product by fully qualified name", getDataProductByNameSchema.shape, wrapToolHandler(getDataProductByName));
tool("create-data-product", "Create a new data product", createDataProductSchema.shape, wrapToolHandler(createDataProduct));
tool("update-data-product", "Update a data product using JSON Patch operations", updateDataProductSchema.shape, wrapToolHandler(updateDataProduct));
tool("delete-data-product", "Delete a data product by UUID", deleteDataProductSchema.shape, wrapToolHandler(deleteDataProduct));

// --- Users ---
currentCategory = "admin";

tool("list-users", "List users with pagination and team filtering", listUsersSchema.shape, wrapToolHandler(listUsers));
tool("get-user", "Get user details by UUID", getUserSchema.shape, wrapToolHandler(getUser));
tool("get-user-by-name", "Get user by username", getUserByNameSchema.shape, wrapToolHandler(getUserByName));

// --- Teams ---

tool("list-teams", "List teams with pagination", listTeamsSchema.shape, wrapToolHandler(listTeams));
tool("get-team", "Get team details by UUID", getTeamSchema.shape, wrapToolHandler(getTeam));
tool("get-team-by-name", "Get team by name", getTeamByNameSchema.shape, wrapToolHandler(getTeamByName));
tool("create-team", "Create a new team", createTeamSchema.shape, wrapToolHandler(createTeam));
tool("update-team", "Update a team using JSON Patch operations", updateTeamSchema.shape, wrapToolHandler(updateTeam));
tool("delete-team", "Delete a team by UUID", deleteTeamSchema.shape, wrapToolHandler(deleteTeam));

// --- Roles ---

tool("list-roles", "List roles with pagination", listRolesSchema.shape, wrapToolHandler(listRoles));
tool("get-role", "Get role details by name", getRoleSchema.shape, wrapToolHandler(getRole));

// --- Policies ---

tool("list-policies", "List policies with pagination", listPoliciesSchema.shape, wrapToolHandler(listPolicies));
tool("get-policy", "Get policy details by name", getPolicySchema.shape, wrapToolHandler(getPolicy));

// --- Data Quality ---
currentCategory = "quality";

tool("list-test-suites", "List data quality test suites", listTestSuitesSchema.shape, wrapToolHandler(listTestSuites));
tool("get-test-suite", "Get test suite details by UUID", getTestSuiteSchema.shape, wrapToolHandler(getTestSuite));
tool("get-test-suite-by-name", "Get test suite by fully qualified name", getTestSuiteByNameSchema.shape, wrapToolHandler(getTestSuiteByName));
tool("list-test-cases", "List data quality test cases with filtering", listTestCasesSchema.shape, wrapToolHandler(listTestCases));
tool("get-test-case", "Get test case details by UUID", getTestCaseSchema.shape, wrapToolHandler(getTestCase));
tool("get-test-case-by-name", "Get test case by fully qualified name", getTestCaseByNameSchema.shape, wrapToolHandler(getTestCaseByName));
tool("list-test-case-results", "List test case execution results", listTestCaseResultsSchema.shape, wrapToolHandler(listTestCaseResults));

// --- Stored Procedures ---
currentCategory = "discovery";

tool("list-stored-procedures", "List stored procedures with pagination", listStoredProceduresSchema.shape, wrapToolHandler(listStoredProcedures));
tool("get-stored-procedure", "Get stored procedure details by UUID", getStoredProcedureSchema.shape, wrapToolHandler(getStoredProcedure));
tool("get-stored-procedure-by-name", "Get stored procedure by fully qualified name", getStoredProcedureByNameSchema.shape, wrapToolHandler(getStoredProcedureByName));
tool("create-stored-procedure", "Create a new stored procedure", createStoredProcedureSchema.shape, wrapToolHandler(createStoredProcedure));
tool("update-stored-procedure", "Update a stored procedure using JSON Patch operations", updateStoredProcedureSchema.shape, wrapToolHandler(updateStoredProcedure));
tool("delete-stored-procedure", "Delete a stored procedure by UUID", deleteStoredProcedureSchema.shape, wrapToolHandler(deleteStoredProcedure));

// --- Queries ---

tool("list-queries", "List saved queries with pagination", listQueriesSchema.shape, wrapToolHandler(listQueries));
tool("get-query", "Get query details by UUID", getQuerySchema.shape, wrapToolHandler(getQuery));
tool("create-query", "Save a new SQL query", createQuerySchema.shape, wrapToolHandler(createQuery));
tool("update-query", "Update a saved query using JSON Patch operations", updateQuerySchema.shape, wrapToolHandler(updateQuery));
tool("delete-query", "Delete a saved query by UUID", deleteQuerySchema.shape, wrapToolHandler(deleteQuery));

// --- Events ---
currentCategory = "events";

tool("list-events", "List event subscriptions", listEventsSchema.shape, wrapToolHandler(listEvents));
tool("get-event-subscription", "Get event subscription details by UUID", getEventSubscriptionSchema.shape, wrapToolHandler(getEventSubscription));
tool("get-event-subscription-by-name", "Get event subscription by name", getEventSubscriptionByNameSchema.shape, wrapToolHandler(getEventSubscriptionByName));

// --- Bots ---
currentCategory = "admin";

tool("list-bots", "List bots with pagination", listBotsSchema.shape, wrapToolHandler(listBots));
tool("get-bot", "Get bot details by UUID", getBotSchema.shape, wrapToolHandler(getBot));
tool("get-bot-by-name", "Get bot by name", getBotByNameSchema.shape, wrapToolHandler(getBotByName));

// --- Sample Data ---
currentCategory = "quality";

tool("get-table-sample-data", "Get sample data rows for a table by UUID (use this instead of querying BigQuery directly)", getTableSampleDataSchema.shape, wrapToolHandler(getTableSampleData));
tool("get-table-sample-data-by-name", "Get sample data rows for a table by fully qualified name", getTableSampleDataByNameSchema.shape, wrapToolHandler(getTableSampleDataByName));
tool("get-topic-sample-data", "Get sample data (messages) for a topic by UUID", getTopicSampleDataSchema.shape, wrapToolHandler(getTopicSampleData));
tool("get-topic-sample-data-by-name", "Get sample data (messages) for a topic by fully qualified name", getTopicSampleDataByNameSchema.shape, wrapToolHandler(getTopicSampleDataByName));
tool("get-container-sample-data", "Get sample data for a storage container by UUID", getContainerSampleDataSchema.shape, wrapToolHandler(getContainerSampleData));
tool("get-container-sample-data-by-name", "Get sample data for a storage container by fully qualified name", getContainerSampleDataByNameSchema.shape, wrapToolHandler(getContainerSampleDataByName));

// --- OM 1.12+ entities (Data Contracts / Metrics / Search Indexes / API Collections / API Endpoints) ---
currentCategory = "entities";

tool("list-data-contracts", "List Data Contracts (OM 1.12+) with pagination", listDataContractsSchema.shape, wrapToolHandler(listDataContracts));
tool("get-data-contract-by-name", "Get a Data Contract by fully qualified name (OM 1.12+)", getDataContractByNameSchema.shape, wrapToolHandler(getDataContractByName));

tool("list-metrics", "List business/operational Metrics (OM 1.12+) with pagination", listMetricsSchema.shape, wrapToolHandler(listMetrics));
tool("get-metric-by-name", "Get a Metric by fully qualified name (OM 1.12+)", getMetricByNameSchema.shape, wrapToolHandler(getMetricByName));

tool("list-search-indexes", "List Search Indexes (e.g. ElasticSearch/OpenSearch) with pagination", listSearchIndexesSchema.shape, wrapToolHandler(listSearchIndexes));
tool("get-search-index-by-name", "Get a Search Index by fully qualified name", getSearchIndexByNameSchema.shape, wrapToolHandler(getSearchIndexByName));

tool("list-api-collections", "List API Collections (OM 1.12+) with pagination", listApiCollectionsSchema.shape, wrapToolHandler(listApiCollections));
tool("get-api-collection-by-name", "Get an API Collection by fully qualified name (OM 1.12+)", getApiCollectionByNameSchema.shape, wrapToolHandler(getApiCollectionByName));

tool("list-api-endpoints", "List API Endpoints (OM 1.12+) with pagination", listApiEndpointsSchema.shape, wrapToolHandler(listApiEndpoints));
tool("get-api-endpoint-by-name", "Get an API Endpoint by fully qualified name (OM 1.12+)", getApiEndpointByNameSchema.shape, wrapToolHandler(getApiEndpointByName));

// --- Aggregation tools (round-trip elimination) ---
currentCategory = "core";

tool("get-table-summary",
  "Aggregated table view: entity + lineage + (optional) sample data + (optional) DQ test cases in a single call. Replaces 3-4 round-trips of get-table-by-name + get-lineage + get-sample-data + list-test-cases.",
  getTableSummarySchema.shape, wrapToolHandler(getTableSummary));

tool("get-domain-summary",
  "Aggregated Domain scope: domain config (experts/owners/description) + per-entity-type counts and samples (data products, tables, dashboards, pipelines, topics, ml models) in a single call. Replaces 5-7 sequential round-trips. Failures per entity-type are collected in `caveats`.",
  getDomainSummarySchema.shape, wrapToolHandler(getDomainSummary));

// --- Meta tools (always enabled) ---
currentCategory = "meta";

tool("search-tools",
  "Discover available tools by natural language query. Returns matching tool names + descriptions across all categories. Use this to navigate the 154-tool surface efficiently — call this first, then call the specific tool you need.",
  searchToolsSchema.shape, wrapToolHandler(searchTools));

// --- MCP Resources (om:// URI scheme) ---
registerResources(server);

// --- MCP Prompts (workflow templates) ---
registerPrompts(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenMetadata MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
