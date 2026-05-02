import { createWrapToolHandler } from "@us-all/mcp-toolkit";
import { config } from "../config.js";
import { OpenMetadataError } from "../client.js";

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

export const wrapToolHandler = createWrapToolHandler({
  redactionPatterns: [/OPENMETADATA_TOKEN/i],
  errorExtractors: [
    {
      match: (error) => error instanceof WriteBlockedError,
      extract: (error) => ({
        kind: "passthrough",
        text: (error as WriteBlockedError).message,
      }),
    },
    {
      match: (error) => error instanceof OpenMetadataError,
      extract: (error) => {
        const err = error as OpenMetadataError;
        return {
          kind: "structured",
          data: {
            message: err.message,
            status: err.status,
            details: err.body,
          },
        };
      },
    },
  ],
});
