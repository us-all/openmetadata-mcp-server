import { config } from "../config.js";
import { OpenMetadataError } from "../client.js";

const SENSITIVE_PATTERNS = [
  /OPENMETADATA_TOKEN/i,
  /authorization/i,
  /bearer\s+\S+/i,
  /api[_-]?key/i,
  /password/i,
  /secret/i,
];

function sanitize(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export class WriteBlockedError extends Error {
  constructor() {
    super("Write operations are disabled. Set OPENMETADATA_ALLOW_WRITE=true to enable.");
    this.name = "WriteBlockedError";
  }
}

export function assertWriteAllowed(): void {
  if (!config.allowWrite) {
    throw new WriteBlockedError();
  }
}

export function wrapToolHandler<T>(fn: (params: T) => Promise<unknown>) {
  return async (params: T) => {
    try {
      const result = await fn(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof WriteBlockedError) {
        return {
          content: [{ type: "text" as const, text: error.message }],
          isError: true,
        };
      }

      const structured: Record<string, unknown> = {
        message: "Unknown error",
      };

      if (error instanceof OpenMetadataError) {
        structured.message = sanitize(error.message);
        structured.status = error.status;
        structured.details = error.body;
      } else if (error instanceof Error) {
        structured.message = sanitize(error.message);
      } else {
        structured.message = sanitize(String(error));
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(structured, null, 2) }],
        isError: true,
      };
    }
  };
}
