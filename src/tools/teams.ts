import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- list-teams ---

export const listTeamsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'users,owns,defaultRoles,parents')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  parentTeam: z.string().optional().describe("Filter by parent team name"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listTeams(params: z.infer<typeof listTeamsSchema>) {
  return omClient.get("/teams", params);
}

// --- get-team ---

export const getTeamSchema = z.object({
  id: z.string().describe("Team UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTeam(params: z.infer<typeof getTeamSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/teams/${id}`, query);
}

// --- get-team-by-name ---

export const getTeamByNameSchema = z.object({
  name: z.string().describe("Team name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTeamByName(params: z.infer<typeof getTeamByNameSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/teams/name/${encodeURIComponent(name)}`, query);
}

// --- create-team ---

export const createTeamSchema = z.object({
  name: z.string().describe("Team name"),
  teamType: z.enum(["Department", "Division", "Group", "BusinessUnit", "Organization"]).describe("Type of team"),
  description: z.string().optional().describe("Team description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
  parents: z.array(z.record(z.string(), z.any())).optional().describe("Parent team references"),
  defaultRoles: z.array(z.record(z.string(), z.any())).optional().describe("Default roles for team members"),
  policies: z.array(z.record(z.string(), z.any())).optional().describe("Policies associated with the team"),
});

export async function createTeam(params: z.infer<typeof createTeamSchema>) {
  assertWriteAllowed();
  return omClient.post("/teams", params);
}

// --- update-team ---

export const updateTeamSchema = z.object({
  id: z.string().describe("Team UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateTeam(params: z.infer<typeof updateTeamSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/teams/${params.id}`, params.operations);
}

// --- delete-team ---

export const deleteTeamSchema = z.object({
  id: z.string().describe("Team UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteTeam(params: z.infer<typeof deleteTeamSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/teams/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
