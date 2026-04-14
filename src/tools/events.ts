import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- list-events ---

export const listEventsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listEvents(params: z.infer<typeof listEventsSchema>) {
  return omClient.get("/events/subscriptions", params);
}

// --- get-event-subscription ---

export const getEventSubscriptionSchema = z.object({
  id: z.string().describe("Event Subscription UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getEventSubscription(params: z.infer<typeof getEventSubscriptionSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/events/subscriptions/${id}`, query);
}

// --- get-event-subscription-by-name ---

export const getEventSubscriptionByNameSchema = z.object({
  name: z.string().describe("Event Subscription name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getEventSubscriptionByName(params: z.infer<typeof getEventSubscriptionByNameSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/events/subscriptions/name/${encodeURIComponent(name)}`, query);
}
