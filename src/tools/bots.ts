import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- list-bots ---

export const listBotsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listBots(params: z.infer<typeof listBotsSchema>) {
  return omClient.get("/bots", params);
}

// --- get-bot ---

export const getBotSchema = z.object({
  id: z.string().describe("Bot UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getBot(params: z.infer<typeof getBotSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/bots/${id}`, query);
}

// --- get-bot-by-name ---

export const getBotByNameSchema = z.object({
  name: z.string().describe("Bot name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getBotByName(params: z.infer<typeof getBotByNameSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/bots/name/${encodeURIComponent(name)}`, query);
}
