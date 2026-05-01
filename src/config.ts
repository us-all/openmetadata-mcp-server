import dotenv from "dotenv";

dotenv.config({ quiet: true });

function parseList(raw: string | undefined): string[] | null {
  if (!raw) return null;
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export const config = {
  host: (process.env.OPENMETADATA_HOST ?? "").replace(/\/+$/, ""),
  token: process.env.OPENMETADATA_TOKEN ?? "",
  allowWrite: process.env.OPENMETADATA_ALLOW_WRITE === "true",
  enabledCategories: parseList(process.env.OM_TOOLS),
  disabledCategories: parseList(process.env.OM_DISABLE),
};

export function validateConfig(): void {
  if (!config.host) {
    throw new Error("OPENMETADATA_HOST environment variable is required");
  }
  if (!config.token) {
    throw new Error("OPENMETADATA_TOKEN environment variable is required");
  }
}
