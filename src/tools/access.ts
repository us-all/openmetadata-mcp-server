import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- list-roles ---

export const listRolesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'policies,teams,users')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listRoles(params: z.infer<typeof listRolesSchema>) {
  return omClient.get("/roles", params);
}

// --- get-role ---

export const getRoleSchema = z.object({
  name: z.string().describe("Role name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getRole(params: z.infer<typeof getRoleSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/roles/name/${encodeURIComponent(name)}`, query);
}

// --- list-policies ---

export const listPoliciesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'rules,teams,roles')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listPolicies(params: z.infer<typeof listPoliciesSchema>) {
  return omClient.get("/policies", params);
}

// --- get-policy ---

export const getPolicySchema = z.object({
  name: z.string().describe("Policy name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getPolicy(params: z.infer<typeof getPolicySchema>) {
  const { name, ...query } = params;
  return omClient.get(`/policies/name/${encodeURIComponent(name)}`, query);
}
