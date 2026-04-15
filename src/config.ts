import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const config = {
  host: (process.env.OPENMETADATA_HOST ?? "").replace(/\/+$/, ""),
  token: process.env.OPENMETADATA_TOKEN ?? "",
  allowWrite: process.env.OPENMETADATA_ALLOW_WRITE === "true",
};

export function validateConfig(): void {
  if (!config.host) {
    throw new Error("OPENMETADATA_HOST environment variable is required");
  }
  if (!config.token) {
    throw new Error("OPENMETADATA_TOKEN environment variable is required");
  }
}
