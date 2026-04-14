import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- list-users ---

export const listUsersSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'teams,roles,owns,follows')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  team: z.string().optional().describe("Filter by team name"),
  isAdmin: z.boolean().optional().describe("Filter by admin status"),
  isBot: z.boolean().optional().describe("Filter by bot status"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listUsers(params: z.infer<typeof listUsersSchema>) {
  return omClient.get("/users", params);
}

// --- get-user ---

export const getUserSchema = z.object({
  id: z.string().describe("User UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getUser(params: z.infer<typeof getUserSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/users/${id}`, query);
}

// --- get-user-by-name ---

export const getUserByNameSchema = z.object({
  name: z.string().describe("User name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getUserByName(params: z.infer<typeof getUserByNameSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/users/name/${encodeURIComponent(name)}`, query);
}
