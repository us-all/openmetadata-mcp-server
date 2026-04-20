#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./config.js";
import { wrapToolHandler } from "./tools/utils.js";

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
  addTableSampleDataSchema, addTableSampleData,
  deleteTableSampleDataSchema, deleteTableSampleData,
  getTopicSampleDataSchema, getTopicSampleData,
  getTopicSampleDataByNameSchema, getTopicSampleDataByName,
  getContainerSampleDataSchema, getContainerSampleData,
  getContainerSampleDataByNameSchema, getContainerSampleDataByName,
} from "./tools/sample-data.js";

validateConfig();

const server = new McpServer({
  name: "openmetadata",
  version: "1.0.0",
});

// --- Search ---

server.tool("search-metadata", "Search OpenMetadata entities (tables, topics, dashboards, pipelines, glossary terms, etc.) by keyword", searchMetadataSchema.shape, wrapToolHandler(searchMetadata));
server.tool("suggest-metadata", "Get autocomplete suggestions for OpenMetadata entity names", suggestMetadataSchema.shape, wrapToolHandler(suggestMetadata));

// --- Tables ---

server.tool("list-tables", "List tables with pagination and optional field expansion", listTablesSchema.shape, wrapToolHandler(listTables));
server.tool("get-table", "Get table details by UUID", getTableSchema.shape, wrapToolHandler(getTable));
server.tool("get-table-by-name", "Get table details by fully qualified name", getTableByNameSchema.shape, wrapToolHandler(getTableByName));
server.tool("create-table", "Create a new table in OpenMetadata", createTableSchema.shape, wrapToolHandler(createTable));
server.tool("update-table", "Update a table using JSON Patch operations", updateTableSchema.shape, wrapToolHandler(updateTable));
server.tool("delete-table", "Delete a table by UUID", deleteTableSchema.shape, wrapToolHandler(deleteTable));

// --- Databases ---

server.tool("list-databases", "List databases with pagination and service filtering", listDatabasesSchema.shape, wrapToolHandler(listDatabases));
server.tool("get-database", "Get database details by UUID", getDatabaseSchema.shape, wrapToolHandler(getDatabase));
server.tool("get-database-by-name", "Get database details by fully qualified name", getDatabaseByNameSchema.shape, wrapToolHandler(getDatabaseByName));
server.tool("create-database", "Create a new database in OpenMetadata", createDatabaseSchema.shape, wrapToolHandler(createDatabase));
server.tool("update-database", "Update a database using JSON Patch operations", updateDatabaseSchema.shape, wrapToolHandler(updateDatabase));
server.tool("delete-database", "Delete a database by UUID", deleteDatabaseSchema.shape, wrapToolHandler(deleteDatabase));

// --- Database Schemas ---

server.tool("list-schemas", "List database schemas with pagination", listSchemasSchema.shape, wrapToolHandler(listSchemas));
server.tool("get-schema", "Get database schema details by UUID", getSchemaSchema.shape, wrapToolHandler(getSchema));
server.tool("get-schema-by-name", "Get database schema details by fully qualified name", getSchemaByNameSchema.shape, wrapToolHandler(getSchemaByName));
server.tool("create-schema", "Create a new database schema", createSchemaSchema.shape, wrapToolHandler(createSchema));
server.tool("update-schema", "Update a database schema using JSON Patch operations", updateSchemaSchema.shape, wrapToolHandler(updateSchema));
server.tool("delete-schema", "Delete a database schema by UUID", deleteSchemaSchema.shape, wrapToolHandler(deleteSchema));

// --- Lineage ---

server.tool("get-lineage", "Get upstream and downstream lineage for an entity by UUID", getLineageSchema.shape, wrapToolHandler(getLineage));
server.tool("get-lineage-by-name", "Get upstream and downstream lineage for an entity by FQN", getLineageByNameSchema.shape, wrapToolHandler(getLineageByName));
server.tool("add-lineage", "Add or update lineage edge between two entities", addLineageSchema.shape, wrapToolHandler(addLineage));
server.tool("delete-lineage", "Delete a lineage edge between two entities", deleteLineageSchema.shape, wrapToolHandler(deleteLineage));

// --- Database Services ---

server.tool("list-database-services", "List database services (connectors)", listDatabaseServicesSchema.shape, wrapToolHandler(listDatabaseServices));
server.tool("get-database-service", "Get database service details by UUID", getDatabaseServiceSchema.shape, wrapToolHandler(getDatabaseService));
server.tool("get-database-service-by-name", "Get database service by name", getDatabaseServiceByNameSchema.shape, wrapToolHandler(getDatabaseServiceByName));
server.tool("create-database-service", "Create a new database service connector", createDatabaseServiceSchema.shape, wrapToolHandler(createDatabaseService));
server.tool("update-database-service", "Update a database service using JSON Patch", updateDatabaseServiceSchema.shape, wrapToolHandler(updateDatabaseService));
server.tool("delete-database-service", "Delete a database service", deleteDatabaseServiceSchema.shape, wrapToolHandler(deleteDatabaseService));

// --- Dashboard Services ---

server.tool("list-dashboard-services", "List dashboard services", listDashboardServicesSchema.shape, wrapToolHandler(listDashboardServices));
server.tool("get-dashboard-service", "Get dashboard service by name", getDashboardServiceSchema.shape, wrapToolHandler(getDashboardService));

// --- Messaging Services ---

server.tool("list-messaging-services", "List messaging services (Kafka, etc.)", listMessagingServicesSchema.shape, wrapToolHandler(listMessagingServices));
server.tool("get-messaging-service", "Get messaging service by name", getMessagingServiceSchema.shape, wrapToolHandler(getMessagingService));

// --- Pipeline Services ---

server.tool("list-pipeline-services", "List pipeline services (Airflow, etc.)", listPipelineServicesSchema.shape, wrapToolHandler(listPipelineServices));
server.tool("get-pipeline-service", "Get pipeline service by name", getPipelineServiceSchema.shape, wrapToolHandler(getPipelineService));

// --- ML Model Services ---

server.tool("list-ml-model-services", "List ML model services", listMlModelServicesSchema.shape, wrapToolHandler(listMlModelServices));
server.tool("get-ml-model-service", "Get ML model service by name", getMlModelServiceSchema.shape, wrapToolHandler(getMlModelService));

// --- Storage Services ---

server.tool("list-storage-services", "List storage services (S3, GCS, etc.)", listStorageServicesSchema.shape, wrapToolHandler(listStorageServices));
server.tool("get-storage-service", "Get storage service by name", getStorageServiceSchema.shape, wrapToolHandler(getStorageService));

// --- Glossaries ---

server.tool("list-glossaries", "List glossaries with pagination", listGlossariesSchema.shape, wrapToolHandler(listGlossaries));
server.tool("get-glossary", "Get glossary details by UUID", getGlossarySchema.shape, wrapToolHandler(getGlossary));
server.tool("get-glossary-by-name", "Get glossary details by name", getGlossaryByNameSchema.shape, wrapToolHandler(getGlossaryByName));
server.tool("create-glossary", "Create a new glossary for business terms", createGlossarySchema.shape, wrapToolHandler(createGlossary));
server.tool("update-glossary", "Update a glossary using JSON Patch operations", updateGlossarySchema.shape, wrapToolHandler(updateGlossary));
server.tool("delete-glossary", "Delete a glossary by UUID", deleteGlossarySchema.shape, wrapToolHandler(deleteGlossary));

// --- Glossary Terms ---

server.tool("list-glossary-terms", "List glossary terms with pagination and glossary filtering", listGlossaryTermsSchema.shape, wrapToolHandler(listGlossaryTerms));
server.tool("get-glossary-term", "Get glossary term details by UUID", getGlossaryTermSchema.shape, wrapToolHandler(getGlossaryTerm));
server.tool("get-glossary-term-by-name", "Get glossary term by fully qualified name", getGlossaryTermByNameSchema.shape, wrapToolHandler(getGlossaryTermByName));
server.tool("create-glossary-term", "Create a new glossary term", createGlossaryTermSchema.shape, wrapToolHandler(createGlossaryTerm));
server.tool("update-glossary-term", "Update a glossary term using JSON Patch operations", updateGlossaryTermSchema.shape, wrapToolHandler(updateGlossaryTerm));
server.tool("delete-glossary-term", "Delete a glossary term by UUID", deleteGlossaryTermSchema.shape, wrapToolHandler(deleteGlossaryTerm));

// --- Dashboards ---

server.tool("list-dashboards", "List dashboards with pagination and service filtering", listDashboardsSchema.shape, wrapToolHandler(listDashboards));
server.tool("get-dashboard", "Get dashboard details by UUID", getDashboardSchema.shape, wrapToolHandler(getDashboard));
server.tool("get-dashboard-by-name", "Get dashboard by fully qualified name", getDashboardByNameSchema.shape, wrapToolHandler(getDashboardByName));
server.tool("create-dashboard", "Create a new dashboard", createDashboardSchema.shape, wrapToolHandler(createDashboard));
server.tool("update-dashboard", "Update a dashboard using JSON Patch operations", updateDashboardSchema.shape, wrapToolHandler(updateDashboard));
server.tool("delete-dashboard", "Delete a dashboard by UUID", deleteDashboardSchema.shape, wrapToolHandler(deleteDashboard));

// --- Pipelines ---

server.tool("list-pipelines", "List pipelines with pagination and service filtering", listPipelinesSchema.shape, wrapToolHandler(listPipelines));
server.tool("get-pipeline", "Get pipeline details by UUID", getPipelineSchema.shape, wrapToolHandler(getPipeline));
server.tool("get-pipeline-by-name", "Get pipeline by fully qualified name", getPipelineByNameSchema.shape, wrapToolHandler(getPipelineByName));
server.tool("create-pipeline", "Create a new pipeline", createPipelineSchema.shape, wrapToolHandler(createPipeline));
server.tool("update-pipeline", "Update a pipeline using JSON Patch operations", updatePipelineSchema.shape, wrapToolHandler(updatePipeline));
server.tool("delete-pipeline", "Delete a pipeline by UUID", deletePipelineSchema.shape, wrapToolHandler(deletePipeline));

// --- Topics ---

server.tool("list-topics", "List topics (Kafka, etc.) with pagination", listTopicsSchema.shape, wrapToolHandler(listTopics));
server.tool("get-topic", "Get topic details by UUID", getTopicSchema.shape, wrapToolHandler(getTopic));
server.tool("get-topic-by-name", "Get topic by fully qualified name", getTopicByNameSchema.shape, wrapToolHandler(getTopicByName));
server.tool("create-topic", "Create a new topic", createTopicSchema.shape, wrapToolHandler(createTopic));
server.tool("update-topic", "Update a topic using JSON Patch operations", updateTopicSchema.shape, wrapToolHandler(updateTopic));
server.tool("delete-topic", "Delete a topic by UUID", deleteTopicSchema.shape, wrapToolHandler(deleteTopic));

// --- Charts ---

server.tool("list-charts", "List charts with pagination and service filtering", listChartsSchema.shape, wrapToolHandler(listCharts));
server.tool("get-chart", "Get chart details by UUID", getChartSchema.shape, wrapToolHandler(getChart));
server.tool("get-chart-by-name", "Get chart by fully qualified name", getChartByNameSchema.shape, wrapToolHandler(getChartByName));
server.tool("create-chart", "Create a new chart", createChartSchema.shape, wrapToolHandler(createChart));
server.tool("update-chart", "Update a chart using JSON Patch operations", updateChartSchema.shape, wrapToolHandler(updateChart));
server.tool("delete-chart", "Delete a chart by UUID", deleteChartSchema.shape, wrapToolHandler(deleteChart));

// --- Containers ---

server.tool("list-containers", "List storage containers with pagination", listContainersSchema.shape, wrapToolHandler(listContainers));
server.tool("get-container", "Get container details by UUID", getContainerSchema.shape, wrapToolHandler(getContainer));
server.tool("get-container-by-name", "Get container by fully qualified name", getContainerByNameSchema.shape, wrapToolHandler(getContainerByName));
server.tool("create-container", "Create a new storage container", createContainerSchema.shape, wrapToolHandler(createContainer));
server.tool("update-container", "Update a container using JSON Patch operations", updateContainerSchema.shape, wrapToolHandler(updateContainer));
server.tool("delete-container", "Delete a container by UUID", deleteContainerSchema.shape, wrapToolHandler(deleteContainer));

// --- ML Models ---

server.tool("list-ml-models", "List ML models with pagination and service filtering", listMlModelsSchema.shape, wrapToolHandler(listMlModels));
server.tool("get-ml-model", "Get ML model details by UUID", getMlModelSchema.shape, wrapToolHandler(getMlModel));
server.tool("get-ml-model-by-name", "Get ML model by fully qualified name", getMlModelByNameSchema.shape, wrapToolHandler(getMlModelByName));
server.tool("create-ml-model", "Create a new ML model", createMlModelSchema.shape, wrapToolHandler(createMlModel));
server.tool("update-ml-model", "Update an ML model using JSON Patch operations", updateMlModelSchema.shape, wrapToolHandler(updateMlModel));
server.tool("delete-ml-model", "Delete an ML model by UUID", deleteMlModelSchema.shape, wrapToolHandler(deleteMlModel));

// --- Classifications ---

server.tool("list-classifications", "List tag classifications", listClassificationsSchema.shape, wrapToolHandler(listClassifications));
server.tool("get-classification", "Get classification details by name", getClassificationSchema.shape, wrapToolHandler(getClassification));
server.tool("create-classification", "Create a new tag classification", createClassificationSchema.shape, wrapToolHandler(createClassification));
server.tool("delete-classification", "Delete a tag classification", deleteClassificationSchema.shape, wrapToolHandler(deleteClassification));

// --- Tags ---

server.tool("list-tags", "List tags with pagination and classification filtering", listTagsSchema.shape, wrapToolHandler(listTags));
server.tool("get-tag", "Get tag details by UUID", getTagSchema.shape, wrapToolHandler(getTag));
server.tool("get-tag-by-name", "Get tag by fully qualified name", getTagByNameSchema.shape, wrapToolHandler(getTagByName));
server.tool("create-tag", "Create a new tag under a classification", createTagSchema.shape, wrapToolHandler(createTag));
server.tool("update-tag", "Update a tag using JSON Patch operations", updateTagSchema.shape, wrapToolHandler(updateTag));
server.tool("delete-tag", "Delete a tag by UUID", deleteTagSchema.shape, wrapToolHandler(deleteTag));

// --- Domains ---

server.tool("list-domains", "List domains with pagination", listDomainsSchema.shape, wrapToolHandler(listDomains));
server.tool("get-domain", "Get domain details by UUID", getDomainSchema.shape, wrapToolHandler(getDomain));
server.tool("get-domain-by-name", "Get domain by name", getDomainByNameSchema.shape, wrapToolHandler(getDomainByName));
server.tool("create-domain", "Create a new domain", createDomainSchema.shape, wrapToolHandler(createDomain));
server.tool("update-domain", "Update a domain using JSON Patch operations", updateDomainSchema.shape, wrapToolHandler(updateDomain));
server.tool("delete-domain", "Delete a domain by UUID", deleteDomainSchema.shape, wrapToolHandler(deleteDomain));

// --- Data Products ---

server.tool("list-data-products", "List data products with pagination", listDataProductsSchema.shape, wrapToolHandler(listDataProducts));
server.tool("get-data-product", "Get data product details by UUID", getDataProductSchema.shape, wrapToolHandler(getDataProduct));
server.tool("get-data-product-by-name", "Get data product by fully qualified name", getDataProductByNameSchema.shape, wrapToolHandler(getDataProductByName));
server.tool("create-data-product", "Create a new data product", createDataProductSchema.shape, wrapToolHandler(createDataProduct));
server.tool("update-data-product", "Update a data product using JSON Patch operations", updateDataProductSchema.shape, wrapToolHandler(updateDataProduct));
server.tool("delete-data-product", "Delete a data product by UUID", deleteDataProductSchema.shape, wrapToolHandler(deleteDataProduct));

// --- Users ---

server.tool("list-users", "List users with pagination and team filtering", listUsersSchema.shape, wrapToolHandler(listUsers));
server.tool("get-user", "Get user details by UUID", getUserSchema.shape, wrapToolHandler(getUser));
server.tool("get-user-by-name", "Get user by username", getUserByNameSchema.shape, wrapToolHandler(getUserByName));

// --- Teams ---

server.tool("list-teams", "List teams with pagination", listTeamsSchema.shape, wrapToolHandler(listTeams));
server.tool("get-team", "Get team details by UUID", getTeamSchema.shape, wrapToolHandler(getTeam));
server.tool("get-team-by-name", "Get team by name", getTeamByNameSchema.shape, wrapToolHandler(getTeamByName));
server.tool("create-team", "Create a new team", createTeamSchema.shape, wrapToolHandler(createTeam));
server.tool("update-team", "Update a team using JSON Patch operations", updateTeamSchema.shape, wrapToolHandler(updateTeam));
server.tool("delete-team", "Delete a team by UUID", deleteTeamSchema.shape, wrapToolHandler(deleteTeam));

// --- Roles ---

server.tool("list-roles", "List roles with pagination", listRolesSchema.shape, wrapToolHandler(listRoles));
server.tool("get-role", "Get role details by name", getRoleSchema.shape, wrapToolHandler(getRole));

// --- Policies ---

server.tool("list-policies", "List policies with pagination", listPoliciesSchema.shape, wrapToolHandler(listPolicies));
server.tool("get-policy", "Get policy details by name", getPolicySchema.shape, wrapToolHandler(getPolicy));

// --- Data Quality ---

server.tool("list-test-suites", "List data quality test suites", listTestSuitesSchema.shape, wrapToolHandler(listTestSuites));
server.tool("get-test-suite", "Get test suite details by UUID", getTestSuiteSchema.shape, wrapToolHandler(getTestSuite));
server.tool("get-test-suite-by-name", "Get test suite by fully qualified name", getTestSuiteByNameSchema.shape, wrapToolHandler(getTestSuiteByName));
server.tool("list-test-cases", "List data quality test cases with filtering", listTestCasesSchema.shape, wrapToolHandler(listTestCases));
server.tool("get-test-case", "Get test case details by UUID", getTestCaseSchema.shape, wrapToolHandler(getTestCase));
server.tool("get-test-case-by-name", "Get test case by fully qualified name", getTestCaseByNameSchema.shape, wrapToolHandler(getTestCaseByName));
server.tool("list-test-case-results", "List test case execution results", listTestCaseResultsSchema.shape, wrapToolHandler(listTestCaseResults));

// --- Stored Procedures ---

server.tool("list-stored-procedures", "List stored procedures with pagination", listStoredProceduresSchema.shape, wrapToolHandler(listStoredProcedures));
server.tool("get-stored-procedure", "Get stored procedure details by UUID", getStoredProcedureSchema.shape, wrapToolHandler(getStoredProcedure));
server.tool("get-stored-procedure-by-name", "Get stored procedure by fully qualified name", getStoredProcedureByNameSchema.shape, wrapToolHandler(getStoredProcedureByName));
server.tool("create-stored-procedure", "Create a new stored procedure", createStoredProcedureSchema.shape, wrapToolHandler(createStoredProcedure));
server.tool("update-stored-procedure", "Update a stored procedure using JSON Patch operations", updateStoredProcedureSchema.shape, wrapToolHandler(updateStoredProcedure));
server.tool("delete-stored-procedure", "Delete a stored procedure by UUID", deleteStoredProcedureSchema.shape, wrapToolHandler(deleteStoredProcedure));

// --- Queries ---

server.tool("list-queries", "List saved queries with pagination", listQueriesSchema.shape, wrapToolHandler(listQueries));
server.tool("get-query", "Get query details by UUID", getQuerySchema.shape, wrapToolHandler(getQuery));
server.tool("create-query", "Save a new SQL query", createQuerySchema.shape, wrapToolHandler(createQuery));
server.tool("update-query", "Update a saved query using JSON Patch operations", updateQuerySchema.shape, wrapToolHandler(updateQuery));
server.tool("delete-query", "Delete a saved query by UUID", deleteQuerySchema.shape, wrapToolHandler(deleteQuery));

// --- Events ---

server.tool("list-events", "List event subscriptions", listEventsSchema.shape, wrapToolHandler(listEvents));
server.tool("get-event-subscription", "Get event subscription details by UUID", getEventSubscriptionSchema.shape, wrapToolHandler(getEventSubscription));
server.tool("get-event-subscription-by-name", "Get event subscription by name", getEventSubscriptionByNameSchema.shape, wrapToolHandler(getEventSubscriptionByName));

// --- Bots ---

server.tool("list-bots", "List bots with pagination", listBotsSchema.shape, wrapToolHandler(listBots));
server.tool("get-bot", "Get bot details by UUID", getBotSchema.shape, wrapToolHandler(getBot));
server.tool("get-bot-by-name", "Get bot by name", getBotByNameSchema.shape, wrapToolHandler(getBotByName));

// --- Sample Data ---

server.tool("get-table-sample-data", "Get sample data rows for a table by UUID (use this instead of querying BigQuery directly)", getTableSampleDataSchema.shape, wrapToolHandler(getTableSampleData));
server.tool("get-table-sample-data-by-name", "Get sample data rows for a table by fully qualified name", getTableSampleDataByNameSchema.shape, wrapToolHandler(getTableSampleDataByName));
server.tool("add-table-sample-data", "Add or overwrite sample data rows for a table", addTableSampleDataSchema.shape, wrapToolHandler(addTableSampleData));
server.tool("delete-table-sample-data", "Delete sample data for a table by UUID", deleteTableSampleDataSchema.shape, wrapToolHandler(deleteTableSampleData));
server.tool("get-topic-sample-data", "Get sample data (messages) for a topic by UUID", getTopicSampleDataSchema.shape, wrapToolHandler(getTopicSampleData));
server.tool("get-topic-sample-data-by-name", "Get sample data (messages) for a topic by fully qualified name", getTopicSampleDataByNameSchema.shape, wrapToolHandler(getTopicSampleDataByName));
server.tool("get-container-sample-data", "Get sample data for a storage container by UUID", getContainerSampleDataSchema.shape, wrapToolHandler(getContainerSampleData));
server.tool("get-container-sample-data-by-name", "Get sample data for a storage container by fully qualified name", getContainerSampleDataByNameSchema.shape, wrapToolHandler(getContainerSampleDataByName));

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
